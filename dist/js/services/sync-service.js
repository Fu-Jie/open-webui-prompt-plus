// /static/js/services/sync-service.js

import { CONFIG } from '../core/constants.js';
import { logger } from '../core/logger.js';

/**
 * SyncService - Responsible for intelligent background data synchronization
 * Combines event-driven and periodic polling to ensure data freshness while minimizing unnecessary network requests.
 */
export class SyncService {
    constructor(promptManager) {
        this.promptManager = promptManager;
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.syncIntervalTime = 5 * 60 * 1000; // Poll every 5 minutes
    }

    /**
     * Start background sync service
     */
    start() {
        logger.debug('🔄 SyncService started...');

        // Bind event listeners
        window.addEventListener('online', () => this.triggerSync('Network restored'));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.triggerSync('Page visible again');
            }
        });

        // Start periodic polling
        this.startPolling();
    }

    /**
     * Stop background sync service
     */
    stop() {
        logger.debug('🛑 SyncService stopped.');
        window.removeEventListener('online', () => this.triggerSync('Network restored'));
        document.removeEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.triggerSync('Page visible again');
            }
        });
        this.stopPolling();
    }

    /**
     * Trigger a background sync
     * @param {string} reason - Reason for triggering sync, used for logging
     */
    async triggerSync(reason = 'Unknown reason') {
        // Smart throttling: If synced recently, skip this trigger
        const now = Date.now();
        if (now - this.lastSyncTime < 60 * 1000) { // No duplicate sync within 1 minute
            logger.debug(`ℹ️ [${reason}] Sync throttled, less than 1 min since last sync.`);
            return;
        }

        logger.debug(`🚀 [${reason}] Triggering background sync...`);

        try {
            // loadData already implements background update logic internally
            await this.promptManager.loadData((updatedPrompts) => {
                logger.debug('🔄 [SyncService] Background sync complete, UI updated.');
                // Add extra UI notification logic here if needed
            });
            this.lastSyncTime = Date.now();
        } catch (error) {
            logger.error(`❌ [SyncService] Background sync failed:`, error);
        }
    }

    /**
     * Start periodic polling
     */
    startPolling() {
        if (this.syncInterval) {
            this.stopPolling();
        }

        this.syncInterval = setInterval(() => {
            // Smart polling: Only execute when page is visible
            if (document.visibilityState === 'visible') {
                this.triggerSync('Periodic polling');
            } else {
                logger.debug('💤 Page hidden, skipping poll.');
            }
        }, this.syncIntervalTime);

        logger.debug(`🕒 Polling started, interval: ${this.syncIntervalTime / 1000 / 60} mins`);
    }

    /**
     * Stop periodic polling
     */
    stopPolling() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            logger.debug('🛑 Polling stopped.');
        }
    }
}
