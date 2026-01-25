// /static/js/core/storage-manager.js

import { CONFIG } from './constants.js';
import { logger } from './logger.js';

/**
 * StorageManager - Responsible for local persistent storage (LocalStorage)
 * Implements version control and TTL (Time To Live) to ensure data freshness and compatibility.
 */
export class StorageManager {
    constructor(storageKey = 'promptManagerData', version = CONFIG.CACHE_VERSION) {
        this.storageKey = storageKey;
        this.version = version;
        this.storage = localStorage; // Can easily switch to sessionStorage or others
    }

    /**
     * Save data to local storage
     * @param {object} data - Data object containing prompts and categories
     */
    save(data) {
        if (!data || !data.prompts || !data.categories) {
            logger.warn('⚠️ Invalid data, save operation cancelled.');
            return;
        }

        try {
            const payload = {
                version: this.version,
                timestamp: Date.now(),
                data: data,
            };
            this.storage.setItem(this.storageKey, JSON.stringify(payload));
            logger.debug(`💾 Data saved to local cache (Version: ${this.version})`);
        } catch (error) {
            logger.error('❌ Failed to save local cache:', error);
            // If storage is full, try clearing old data
            if (this.isQuotaExceeded(error)) {
                logger.warn('⚠️ Storage quota exceeded, clearing old cache...');
                this.clear();
            }
        }
    }

    /**
     * Load data from local storage
     * @returns {object|null} - Returns cached data object, or null if cache is invalid or expired
     */
    load() {
        try {
            const rawData = this.storage.getItem(this.storageKey);
            if (!rawData) {
                logger.debug('ℹ️ Local cache is empty.');
                return null;
            }

            const payload = JSON.parse(rawData);

            // Check version compatibility
            if (payload.version !== this.version) {
                logger.warn(`Cache version mismatch (Required: ${this.version}, Found: ${payload.version}). Cache invalidated.`);
                this.clear();
                return null;
            }

            // Check data freshness (TTL - Time to Live)
            const age = Date.now() - payload.timestamp;
            if (age > CONFIG.CACHE_TTL) {
                logger.debug(`Cache expired (${Math.round(age / 1000 / 60)} mins ago), background update triggered.`);
                // Even if expired, we still return old data (stale-while-revalidate strategy)
            }

            logger.debug(`✅ Loaded data from local cache (Version: ${this.version})`);
            return payload.data;

        } catch (error) {
            logger.error('❌ Failed to load local cache:', error);
            this.clear(); // If parsing fails, clear corrupted data
            return null;
        }
    }

    /**
     * Clear local storage
     */
    clear() {
        try {
            this.storage.removeItem(this.storageKey);
            logger.debug('🗑️ Local cache cleared.');
        } catch (error) {
            logger.error('❌ Failed to clear local cache:', error);
        }
    }

    /**
     * Check if it is a storage quota exceeded error
     * @param {Error} e - Error object
     * @returns {boolean}
     */
    isQuotaExceeded(e) {
        let quotaExceeded = false;
        if (e) {
            if (e.code) {
                switch (e.code) {
                    case 22: // QuotaExceededError in Chrome
                    case 1014: // QuotaExceededError in Firefox/IE
                        quotaExceeded = true;
                        break;
                }
            } else if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                quotaExceeded = true;
            }
        }
        return quotaExceeded;
    }
}
