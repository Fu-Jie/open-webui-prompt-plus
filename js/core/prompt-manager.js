import { CONFIG, DEFAULT_CATEGORIES, getDefaultCategories } from './constants.js';
import { DEFAULT_PROMPTS } from './default-prompts.js';
import { i18n } from './i18n.js';
import { OpenWebUIAPI } from '../services/openwebui-api.js?v=20260121-007';
import { StorageManager } from './storage-manager.js';
import { generateUUID, debounce, mapTagsToCategory, extractTagsFromText } from '../utils/helpers.js';
import { logger } from './logger.js';

// Prompt Manager Class
export class PromptManager {
    constructor() {
        this.prompts = [];
        this.categories = getDefaultCategories();
        this.api = new OpenWebUIAPI();
        this.storage = new StorageManager();

        // Central Metadata Storage
        this.metadata = null;
        this.currentUser = null;

        // Performance Optimization Cache
        this.cache = {
            aiTags: new Map(),
            apiResults: new Map(),
            commands: new Map(),
            lastCacheClean: Date.now()
        };

        // Batch Processing Queue
        this.batchQueue = {
            tags: [],
            commands: [],
            processing: false
        };

        // Debounce and Throttle Cache
        this.debounceTimers = new Map();
        this.throttleCache = new Map();

        // Debounce Save Metadata
        this.debouncedSaveMetadata = debounce(() => this.saveMetadataStore(), CONFIG.DEBOUNCE_DELAY);
    }

    // Refresh categories with current language
    refreshCategories() {
        const defaultCats = getDefaultCategories();
        const customCats = (this.metadata && this.metadata.categories) ? this.metadata.categories : [];
        this.categories = this.mergeCategories(defaultCats, customCats);
        logger.debug('[PromptManager] Categories refreshed for lang:', CONFIG.LANGUAGE);
    }

    // Merge default categories with custom/cached categories
    mergeCategories(defaultCats, customCats) {
        const merged = [...defaultCats];
        // Create a set of valid system IDs for quick lookup
        const systemIds = new Set(defaultCats.map(c => c.id));

        if (!customCats || !Array.isArray(customCats)) return merged;

        customCats.forEach(customCat => {
            // 1. Check for Exact Match (System Category)
            const index = merged.findIndex(c => c.id === customCat.id);
            if (index !== -1) {
                // For system categories, we always prioritize system display properties
                // (localized name, icon, color, description) from constants.js
                const systemCat = merged[index];

                // Start with system category defaults
                const mergedCat = { ...systemCat };

                // Only merge structural properties from metadata (like order)
                if (customCat.order !== undefined) mergedCat.order = customCat.order;

                // Note: We ignore customCat.name for system categories because 
                // display is now strictly mapped via ID and current language.

                merged[index] = mergedCat;
                return;
            }

            // 2. Check for Legacy ID Match
            // If this custom category has an ID that maps to a system ID, 
            // AND it's not the system ID itself (which would be caught by step 1),
            // Then it's a legacy duplicate. We should SKIP it to avoid duplicates.
            const normalizedId = this.normalizeCategoryId(customCat.id);
            if (normalizedId && systemIds.has(normalizedId)) {
                // It's a legacy category (e.g. 'content-creation' mapping to 'writing')
                // We ignore it in the list to prevent duplicates.
                return;
            }

            // 3. It's a true custom category (new UUID or unknown ID)
            merged.push(customCat);
        });

        // Sort by order if available
        merged.sort((a, b) => (a.order || 999) - (b.order || 999));

        return merged;
    }

    // New Central Storage Data Loading Strategy (Stale-While-Revalidate)
    async loadData(onUpdate) {
        logger.debug('🚀 Loading data (Stale-While-Revalidate)...');
        this.categories = getDefaultCategories();

        // Step 1: Try to load from cache and update UI immediately
        const cachedData = this.storage.load();
        if (cachedData) {
            this.prompts = cachedData.prompts || [];
            // Merge cached categories if available
            if (cachedData.categories && Array.isArray(cachedData.categories)) {
                // If we have cached categories, we use them to restore the UI state quickly.
                // Note: This might contain stale default names if language changed, 
                // but refreshCategories() or subsequent metadata sync will fix it.
                this.categories = cachedData.categories;
            }
            // If metadata is in cache, we can also try to merge properly
            if (cachedData.metadata && cachedData.metadata.categories) {
                this.categories = this.mergeCategories(getDefaultCategories(), cachedData.metadata.categories);
            }
            this.metadata = cachedData.metadata || null;
            this.currentUser = cachedData.currentUser || null;
            logger.debug(`✅ Loaded ${this.prompts.length} prompts from cache.`);
            if (typeof onUpdate === 'function') {
                onUpdate(this.prompts);
            }
        }

        // Step 2: Silently fetch latest data from API in background
        try {
            logger.debug('🔄 [Background] Syncing latest data...');
            const currentUser = await this.api.getCurrentUser();
            const apiPrompts = await this.api.getAllPrompts();
            const metadata = await this.api.getMetadataStore();

            this.currentUser = currentUser;

            if (!metadata) {
                logger.debug('📦 [Background] Metadata store does not exist, initializing...');
                await this.initializeMetadataStore();
            } else {
                this.metadata = metadata;
            }

            await this.syncMetadataWithPrompts(apiPrompts);

            // Re-merge categories after metadata is loaded/synced
            if (this.metadata && this.metadata.categories) {
                this.categories = this.mergeCategories(getDefaultCategories(), this.metadata.categories);
            }

            const freshPrompts = await this.convertAllFromOpenWebUIFormat(apiPrompts);

            // Smart Seeding Logic
            const hasSeeded = localStorage.getItem('defaultPromptsSeeded');
            const hasDefaultPrompt = freshPrompts.some(p => p.command === 'de-sql-optimizer');

            if (!hasDefaultPrompt && !hasSeeded) {
                logger.debug('🌱 Missing default prompts detected and not seeded, starting auto-seeding...');
                await this.seedDefaultPrompts();
                localStorage.setItem('defaultPromptsSeeded', 'true');

                // Re-fetch
                const newApiPrompts = await this.api.getAllPrompts();
                const newFreshPrompts = await this.convertAllFromOpenWebUIFormat(newApiPrompts);
                this.prompts = newFreshPrompts;
                this.enhancePromptsWithMetadata(this.prompts);

                logger.debug('✨ Default data seeding completed, refreshing UI');
                if (typeof onUpdate === 'function') {
                    onUpdate(this.prompts);
                }
                this.saveDataToCache();
            } else {
                this.enhancePromptsWithMetadata(freshPrompts);

                // Step 3: Compare new and old data, update UI and cache if different
                if (JSON.stringify(this.prompts) !== JSON.stringify(freshPrompts)) {
                    logger.debug('✨ [Background] Data updated, refreshing UI and updating cache.');
                    this.prompts = freshPrompts;
                    if (typeof onUpdate === 'function') {
                        onUpdate(this.prompts);
                    }
                    this.saveDataToCache(); // Save all latest data to cache
                } else {
                    logger.debug('✅ [Background] Data is up to date.');
                }
            }

        } catch (error) {
            logger.error('❌ [Background] Failed to sync data:', error);
            if (!cachedData) {
                // If no cache and API fails, use default values
                logger.debug('Failing over to default prompts');
                await this.initializeWithDefaults();
                if (typeof onUpdate === 'function') {
                    onUpdate(this.prompts);
                }
            }
        }

        return this.prompts;
    }

    // Save current state to cache
    saveDataToCache() {
        const dataToCache = {
            prompts: this.prompts,
            categories: this.categories,
            metadata: this.metadata,
            currentUser: this.currentUser
        };
        this.storage.save(dataToCache);
    }

    // Upsert Category (Add or Update)
    async upsertCategory(categoryData) {
        // 1. Update in-memory categories
        const index = this.categories.findIndex(c => c.id === categoryData.id);
        if (index !== -1) {
            this.categories[index] = { ...this.categories[index], ...categoryData };
        } else {
            this.categories.push(categoryData);
        }

        // 2. Update metadata categories (Source of Truth for Customization)
        if (!this.metadata) {
            this.metadata = this.api.getDefaultMetadataStructure();
        }
        if (!this.metadata.categories) {
            this.metadata.categories = [];
        }

        // Clean data for storage: Only save ID, Name (if custom), Order.
        // We do NOT save icon/color/description for system categories to rely on system defaults.
        const dataToSave = {
            id: categoryData.id,
            name: categoryData.name,
            icon: categoryData.icon,
            order: categoryData.order
        };

        const metaIndex = this.metadata.categories.findIndex(c => c.id === categoryData.id);
        if (metaIndex !== -1) {
            // Replace entirely with clean data to remove any legacy fields (icon, color, etc.)
            this.metadata.categories[metaIndex] = dataToSave;
        } else {
            this.metadata.categories.push(dataToSave);
        }

        // 3. Save
        await this.saveMetadataStore();
        this.saveDataToCache();

        return true;
    }

    // Delete Category
    async deleteCategory(categoryId) {
        // 1. Update in-memory categories
        this.categories = this.categories.filter(c => c.id !== categoryId);

        // 2. Update metadata categories
        if (this.metadata && this.metadata.categories) {
            this.metadata.categories = this.metadata.categories.filter(c => c.id !== categoryId);
        }

        // 3. Save
        await this.saveMetadataStore();
        this.saveDataToCache();

        return true;
    }

    // Update Category Name (Legacy wrapper)
    async updateCategory(categoryId, newName) {
        const category = this.categories.find(c => c.id === categoryId);
        if (category) {
            return this.upsertCategory({ ...category, name: newName });
        }
        return false;
    }

    // Initialize Metadata Store
    async initializeMetadataStore() {
        logger.debug('🔧 Initializing central metadata store...');

        try {
            // 1. Get existing prompts (if any)
            let existingPrompts = [];
            try {
                existingPrompts = await this.api.getAllPrompts();
                logger.debug('📄 Found', existingPrompts.length, 'existing business prompts');
            } catch (error) {
                logger.warn('⚠️ Failed to get existing prompts:', error);
                existingPrompts = [];
            }

            // 2. Create default metadata structure
            this.metadata = this.api.getDefaultMetadataStructure();
            logger.debug('📦 Creating default metadata structure');

            // 3. Generate metadata for existing business prompts (Important: Ensure no data loss)
            if (existingPrompts && existingPrompts.length > 0) {
                logger.debug('📝 Starting to generate metadata for existing prompts...');

                // Create metadata entry for each existing prompt
                for (let i = 0; i < existingPrompts.length; i++) {
                    const prompt = existingPrompts[i];
                    const promptId = prompt.command?.replace('/', '') || prompt.id || `prompt_${i}`;

                    // Auto-detect category for existing prompts during initialization
                    const detectedCategory = this.fallbackCategoryDetection(prompt.content, prompt.title);

                    this.metadata.prompts[promptId] = {
                        categoryId: detectedCategory,
                        isFavorite: false,
                        usage: {
                            total: 0,
                            byUser: {}
                        },
                        createdBy: this.currentUser || { id: 'unknown', name: 'Unknown User' },
                        lastModifiedBy: this.currentUser || { id: 'unknown', name: 'Unknown User' },
                        createdAt: prompt.timestamp ?
                            new Date(prompt.timestamp * 1000).toISOString() :
                            new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    logger.debug(`✓ [${i + 1}/${existingPrompts.length}] Initializing prompt "${prompt.title}" -> Category: ${detectedCategory}`);
                }

                logger.debug('✅ Existing prompts metadata generation completed');
            } else {
                logger.debug('ℹ️ No existing business prompts found, using clean metadata structure');
            }

            // 4. If no existing prompts, create empty metadata structure
            if (!existingPrompts || existingPrompts.length === 0) {
                logger.debug('ℹ️ No existing business prompts found, creating empty metadata structure');
                // Do not add default prompts, keep metadata structure empty
            }

            // 5. Create metadata store to OpenWebUI
            logger.debug('💾 Saving metadata store to OpenWebUI...');
            await this.api.createMetadataStore(this.metadata);
            logger.debug('✅ Metadata store initialization completed, containing metadata for', Object.keys(this.metadata.prompts).length, 'prompts');

        } catch (error) {
            logger.error('❌ Failed to initialize metadata store:', error);
            // Even if failed, must have a default metadata structure
            this.metadata = this.api.getDefaultMetadataStructure();
            throw error; // Rethrow error for upper layer handling
        }
    }

    // Sync Metadata with Prompts Data
    async syncMetadataWithPrompts(apiPrompts) {
        logger.debug('🔄 Syncing metadata with prompts...');

        let hasChanges = false;

        // Check if new prompts need to be added to metadata
        for (const prompt of apiPrompts) {
            const promptId = prompt.command?.replace('/', '') || prompt.id;

            if (!this.metadata.prompts[promptId]) {
                logger.debug('➕ Found new prompt:', prompt.title, 'adding to metadata with auto-detection');

                // Auto-detect category for new prompts found during sync
                const detectedCategory = this.fallbackCategoryDetection(prompt.content, prompt.title);

                this.metadata.prompts[promptId] = {
                    categoryId: detectedCategory,
                    isFavorite: false,
                    usage: {
                        total: 0,
                        byUser: {}
                    },
                    createdBy: this.currentUser,
                    lastModifiedBy: this.currentUser,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                hasChanges = true;
            }
        }

        // Clean up metadata for non-existent prompts
        const existingPromptIds = apiPrompts.map(p => p.command?.replace('/', '') || p.id);
        for (const promptId of Object.keys(this.metadata.prompts)) {
            // Ignore system metadata
            if (promptId === '/_' || promptId === '_') continue;

            // Normalize key name for comparison (remove leading /)
            const normalizedKey = promptId.replace(/^\//, '');
            if (!existingPromptIds.includes(normalizedKey)) {
                logger.debug('🗑️ Cleaning up metadata for deleted prompt:', promptId);
                delete this.metadata.prompts[promptId];
                hasChanges = true;
            }
        }

        // If changed, save metadata
        if (hasChanges) {
            await this.saveMetadataStore();
            logger.debug('💾 Metadata sync completed');
        }
    }

    // Enhance Prompts with Metadata
    enhancePromptsWithMetadata(prompts) {
        logger.debug('✨ Enhancing prompts with metadata...');

        for (const prompt of prompts) {
            const promptId = prompt.command || prompt.id;
            // Try multiple key name format matching
            let metadata = this.metadata.prompts[promptId];
            if (!metadata && !promptId.startsWith('/')) {
                metadata = this.metadata.prompts['/' + promptId];
            }
            if (!metadata && promptId.startsWith('/')) {
                metadata = this.metadata.prompts[promptId.substring(1)];
            }

            if (metadata) {
                // Apply Metadata
                // Normalize category ID to ensure legacy categories are mapped to new system categories
                prompt.category = this.normalizeCategoryId(metadata.categoryId);
                prompt.isFavorite = metadata.isFavorite;
                prompt.usageCount = metadata.usage.total;
                prompt.createdBy = metadata.createdBy;
                prompt.lastModifiedBy = metadata.lastModifiedBy;

                // Current user usage count
                prompt.userUsageCount = metadata.usage.byUser[this.currentUser?.id] || 0;
            }
        }
    }

    // Save Metadata to Central Storage
    async saveMetadataStore() {
        if (!this.metadata) {
            logger.warn('⚠️ Metadata is empty, skipping save');
            return;
        }

        try {
            await this.api.updateMetadataStore(this.metadata);
            logger.debug('💾 Metadata saved to central storage');
        } catch (error) {
            logger.error('❌ Failed to save metadata:', error);
            throw error;
        }
    }

    // Fallback plan when API fails (No longer load default prompts)
    async initializeWithDefaults() {
        logger.debug('🔧 API connection failed, initializing default system...');

        try {
            // 1. Use default prompt list
            this.prompts = DEFAULT_PROMPTS.map(p => ({
                id: p.id,
                command: `/${p.id}`,
                title: p.title,
                content: p.content,
                category: p.category,
                usageCount: 0,
                isFavorite: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            logger.debug('📝 Initializing default prompt list:', this.prompts.length);

            // 2. Create default metadata structure
            this.metadata = this.api.getDefaultMetadataStructure();

            // Populate Metadata
            for (const prompt of this.prompts) {
                const command = prompt.command;
                this.metadata.prompts[command] = {
                    categoryId: prompt.category,
                    isFavorite: false,
                    usage: { total: 0, byUser: {} },
                    createdBy: 'system',
                    lastModifiedBy: 'system',
                    createdAt: prompt.createdAt,
                    updatedAt: prompt.updatedAt
                };
            }

            // 3. Try to create metadata store (if API recovers)
            try {
                await this.api.createMetadataStore(this.metadata);
                logger.debug('✅ Default metadata store created successfully');
            } catch (syncError) {
                logger.warn('⚠️ Failed to create metadata store, system will run in memory:', syncError);
            }

            logger.debug('✅ Default system initialization completed');

        } catch (error) {
            logger.error('❌ Initialization failed:', error);
            // Ensure basic empty structure
            if (!this.prompts) {
                this.prompts = [];
            }
            if (!this.metadata) {
                this.metadata = this.api.getDefaultMetadataStructure();
            }
        }
    }

    // Seed Default Prompts to Server
    async seedDefaultPrompts() {
        logger.debug('🌱 Seeding default prompts...');
        let seededCount = 0;

        for (const prompt of DEFAULT_PROMPTS) {
            try {
                const command = `/${prompt.id}`;

                // Create Prompt
                await this.api.createPrompt({
                    command: command,
                    title: prompt.title,
                    content: prompt.content
                });

                // Update Metadata
                if (this.metadata && this.metadata.prompts) {
                    this.metadata.prompts[command] = {
                        categoryId: prompt.category,
                        isFavorite: false,
                        usage: { total: 0, byUser: {} },
                        createdBy: this.currentUser || 'system',
                        lastModifiedBy: this.currentUser || 'system',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                }
                seededCount++;
            } catch (err) {
                // If failed because already exists, ignore
                if (err.message && err.message.includes('already exists')) {
                    logger.debug(`Prompt ${prompt.title} already exists, skipping`);
                } else {
                    logger.error(`Failed to seed prompt ${prompt.title}:`, err);
                }
            }
        }

        if (seededCount > 0 && this.metadata) {
            await this.saveMetadataStore();
            logger.debug(`✅ Successfully seeded ${seededCount} default prompts`);
        }
    }

    // Notes sync function removed, focus on central metadata storage

    // Sync Prompts to OpenWebUI API
    async syncPromptsToAPI(type = 'Prompts', promptsToSync = this.prompts) {
        logger.debug(`🌐 Starting to sync ${promptsToSync.length} ${type} to OpenWebUI API...`);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < promptsToSync.length; i++) {
            const prompt = promptsToSync[i];
            try {
                const command = (prompt.command || prompt.id).replace(/^\/+/, '');
                const apiPayload = {
                    command: `/${command}`,
                    title: prompt.title,
                    content: prompt.content,
                    access_control: null,
                };

                logger.debug(`📤 [${i + 1}/${promptsToSync.length}] Creating prompt: ${prompt.title} (Command: /${command})`);
                const result = await this.api.createPrompt(apiPayload);
                logger.debug(`✅ [${i + 1}/${promptsToSync.length}] Created successfully:`, result);
                successCount++;
            } catch (apiError) {
                errorCount++;
                if (String(apiError.message).includes('409')) {
                    logger.warn(`⚠️ [${i + 1}/${promptsToSync.length}] Prompt "${prompt.title}" already exists in OpenWebUI, skipping creation.`);
                } else {
                    logger.error(`❌ [${i + 1}/${promptsToSync.length}] Failed to sync prompt "${prompt.title}" to OpenWebUI API:`, apiError);
                }
            }
        }
        logger.debug(`🎯 ${type} sync completed! Success: ${successCount}, Error: ${errorCount}`);
        return { successCount, errorCount };
    }

    // Save Data (Use debounce to save metadata)
    saveData() {
        this.debouncedSaveMetadata();
    }

    // Batch Convert OpenWebUI Format to Local Display Format
    async convertAllFromOpenWebUIFormat(openWebUIPrompts) {
        if (!openWebUIPrompts || openWebUIPrompts.length === 0) {
            return [];
        }

        return openWebUIPrompts.map((p, index) => {
            return {
                id: p.command?.replace('/', '') || generateUUID(),
                title: p.title || p.command?.replace('/', '') || 'Untitled Prompt',
                content: p.content || '',
                category: null, // Category defaults to null
                description: `OpenWebUI Prompt (${p.command || ''})`,
                createdAt: p.timestamp ? new Date(p.timestamp * 1000).toISOString() : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                usageCount: 0,
                isFavorite: false,
                command: p.command?.replace('/', ''),
                openwebuiData: p
            };
        });
    }

    // Convert Local Format to OpenWebUI Format
    convertToOpenWebUIFormat(prompt) {
        return this.api.convertToOpenWebUIFormat(prompt);
    }

    // Use OpenWebUI Tag API for Smart Classification and Tag Extraction
    async autoDetectCategory(content, title) {
        try {
            const tags = await this.getAITags(content, title);
            if (tags && tags.length > 0) {
                return mapTagsToCategory(tags);
            }
        } catch (error) {
            logger.warn('AI tag generation failed, using keyword matching:', error);
        }

        return this.fallbackCategoryDetection(content, title);
    }

    // Use OpenWebUI Tag API to Extract Smart Tags - With Cache Optimization
    async extractTags(content, title) {
        const cacheKey = this.generateCacheKey(content, title, 'tags');
        if (this.cache.aiTags.has(cacheKey)) {
            return this.cache.aiTags.get(cacheKey);
        }

        try {
            const aiTags = await this.getAITagsWithCache(content, title);
            if (aiTags && aiTags.length > 0) {
                this.cache.aiTags.set(cacheKey, aiTags);
                return aiTags;
            }
        } catch (error) {
            logger.warn('AI tag extraction failed, using keyword matching:', error);
        }

        const fallbackTags = this.fallbackTagExtraction(content, title);
        this.cache.aiTags.set(cacheKey, fallbackTags);
        return fallbackTags;
    }

    // Generate Cache Key
    generateCacheKey(content, title, type) {
        const input = `${title}:${content.substring(0, 100)}`;
        return `${type}_${this.hashCode(input)}`;
    }

    // Simple Hash Function
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // Cached AI Tag Retrieval
    async getAITagsWithCache(content, title) {
        const cacheKey = this.generateCacheKey(content, title, 'ai_tags');

        if (this.cache.apiResults.has(cacheKey)) {
            const cached = this.cache.apiResults.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
                return cached.data;
            }
        }

        return this.addToBatchQueue('tags', { content, title, cacheKey });
    }

    // Batch Queue Management
    async addToBatchQueue(type, item) {
        this.batchQueue[type].push(item);

        return this.debounceFunction(`batch_${type}`, async () => {
            if (this.batchQueue.processing) return;

            this.batchQueue.processing = true;
            const items = this.batchQueue[type].splice(0);

            try {
                if (type === 'tags') {
                    return await this.processBatchTags(items);
                } else if (type === 'commands') {
                    return await this.processBatchCommands(items);
                }
            } finally {
                this.batchQueue.processing = false;
            }
        }, CONFIG.BATCH_QUEUE_DELAY);
    }

    // Batch Tag Generation
    async processBatchTags(items) {
        const results = [];

        for (const item of items) {
            try {
                const result = await this.api.getAITags(item.content, item.title);

                this.cache.apiResults.set(item.cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });

                results.push(result);
            } catch (error) {
                logger.warn('Batch tag generation failed:', error);
                results.push(this.fallbackTagExtraction(item.content, item.title));
            }
        }

        return results[results.length - 1];
    }

    // Debounce Function
    debounceFunction(key, func, delay) {
        return new Promise((resolve) => {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }

            const timer = setTimeout(async () => {
                this.debounceTimers.delete(key);
                const result = await func();
                resolve(result);
            }, delay);

            this.debounceTimers.set(key, timer);
        });
    }

    // Throttle Function
    throttle(key, func, delay) {
        const now = Date.now();
        const lastCall = this.throttleCache.get(key) || 0;

        if (now - lastCall >= delay) {
            this.throttleCache.set(key, now);
            return func();
        }

        return Promise.resolve(null);
    }

    // Clean Cache
    cleanCache() {
        const now = Date.now();
        const maxAge = CONFIG.CACHE_TTL;

        for (const [key, value] of this.cache.aiTags.entries()) {
            if (now - this.cache.lastCacheClean > maxAge) {
                this.cache.aiTags.delete(key);
            }
        }

        for (const [key, value] of this.cache.apiResults.entries()) {
            if (now - value.timestamp > maxAge) {
                this.cache.apiResults.delete(key);
            }
        }

        for (const [key, value] of this.cache.commands.entries()) {
            if (now - this.cache.lastCacheClean > maxAge) {
                this.cache.commands.delete(key);
            }
        }

        this.cache.lastCacheClean = now;
        logger.debug('Cache cleaned.');
    }

    // Preload Common Data
    async preloadCommonData() {
        const commonPrompts = this.prompts
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5);

        for (const prompt of commonPrompts) {
            const cacheKey = this.generateCacheKey(prompt.content, prompt.title, 'tags');
            if (!this.cache.aiTags.has(cacheKey)) {
                this.extractTags(prompt.content, prompt.title).catch(logger.warn);
            }
        }
    }

    // Use General Chat Interface for Batch Category Retrieval
    async getAICategoryForBatch(prompts, retries = 3) {
        return await this.api.getAICategoryForBatch(prompts, retries);
    }

    // Keyword Matching Fallback Plan (Directly return system built-in category ID)
    fallbackCategoryDetection(content, title) {
        const text = (content + ' ' + title).toLowerCase();

        // Creative Writing (writing)
        if (text.includes('writing') || text.includes('story') || text.includes('creative') ||
            text.includes('article') || text.includes('design') || text.includes('copywriting') ||
            text.includes('brand') || text.includes('ad') || text.includes('promotion') ||
            text.includes('template') || text.includes('script')) {
            return 'writing';
        }

        // Data Analysis (data)
        if (text.includes('sql') || text.includes('database') || text.includes('query') ||
            text.includes('etl') || text.includes('warehouse') || text.includes('modeling') ||
            text.includes('pandas') || text.includes('data analysis') || text.includes('statistics') ||
            text.includes('chart') || text.includes('visualization') || text.includes('machine learning') ||
            text.includes('data') || text.includes('analysis')) {
            return 'data';
        }

        // Productivity (productivity)
        if (text.includes('summary') || text.includes('extract') || text.includes('organize') ||
            text.includes('key info') || text.includes('abstract') || text.includes('conclude') ||
            text.includes('dialogue') || text.includes('chat') || text.includes('customer service') ||
            text.includes('consult') || text.includes('qa') || text.includes('communication') ||
            text.includes('plan') || text.includes('project') || text.includes('management') ||
            text.includes('workflow') || text.includes('task') || text.includes('planning') ||
            text.includes('business') || text.includes('office') || text.includes('email') || text.includes('meeting') ||
            text.includes('convert') || text.includes('format') || text.includes('process') || text.includes('transform') ||
            text.includes('legal') || text.includes('medical') || text.includes('professional') || text.includes('service') ||
            text.includes('productivity') || text.includes('work') || text.includes('email')) {
            return 'productivity';
        }

        // Learning & Education (learning)
        if (text.includes('learning') || text.includes('education') || text.includes('training') ||
            text.includes('teaching') || text.includes('exam') || text.includes('course') ||
            text.includes('reasoning') || text.includes('logic') || text.includes('decision') ||
            text.includes('problem solving') || text.includes('thinking') || text.includes('academic') || text.includes('paper') ||
            text.includes('study') || text.includes('research')) {
            return 'learning';
        }

        // Coding & Technology (coding)
        if (text.includes('python') || text.includes('code') || text.includes('programming') ||
            text.includes('script') || text.includes('development') || text.includes('tech') ||
            text.includes('software') || text.includes('api') || text.includes('frontend') || text.includes('backend') ||
            text.includes('coding') || text.includes('dev')) {
            return 'coding';
        }

        // Roleplay (roleplay)
        if (text.includes('role') || text.includes('play') || text.includes('simulate') ||
            text.includes('game') || text.includes('persona') || text.includes('roleplay') ||
            text.includes('simulation')) {
            return 'roleplay';
        }

        // Lifestyle (lifestyle)
        if (text.includes('travel') || text.includes('recipe') || text.includes('leisure') ||
            text.includes('entertainment') || text.includes('life') || text.includes('fitness') ||
            text.includes('lifestyle') || text.includes('food')) {
            return 'lifestyle';
        }

        // Default: Productivity
        return 'productivity';
    }

    // Keyword Tag Extraction Fallback Plan
    fallbackTagExtraction(content, title) {
        return extractTagsFromText(content + ' ' + title);
    }

    // Use AI to Generate Smart Command Name
    async generateCommand(title, content = '') {
        try {
            const aiCommand = await this.api.generateAICommand(title, content);
            if (aiCommand) {
                return this.api.sanitizeCommand(aiCommand);
            }
        } catch (error) {
            logger.warn('AI command generation failed, using fallback plan:', error);
        }

        return this.fallbackGenerateCommand(title);
    }

    // Fallback Command Generation Plan
    fallbackGenerateCommand(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 20) || 'prompt';
    }

    // Get Default Categories
    getDefaultCategories() {
        return DEFAULT_CATEGORIES;
    }

    // Validate Category ID
    isValidCategoryId(id) {
        if (!id) return false;
        return (this.categories || DEFAULT_CATEGORIES).some(c => c.id === id);
    }

    // Normalize External/Legacy Category ID, Map to System Built-in Categories
    normalizeCategoryId(id) {
        if (!id) return null; // If input ID is empty, return null

        const map = {
            // Map old category IDs to new universal IDs
            'office-assistant': 'productivity',
            'code-development': 'coding',
            'content-creation': 'writing',
            'data-science': 'data',
            'learning-research': 'learning',
            'prompt-engineering': 'roleplay', // Closest match
            'life-fun': 'lifestyle',
            // Legacy mappings
            'text-creation': 'writing',
            'data-analysis': 'data',
            'data-engineering': 'data',
            'system-design': 'coding',
            'information-extraction': 'productivity',
            'dialogue-assistant': 'roleplay',
            'task-planning': 'productivity',
            'logic-reasoning': 'learning',
            'business-office': 'productivity',
            'education-training': 'learning',
            'tech-development': 'coding',
            'creative-design': 'writing',
            'marketing-promotion': 'writing',
            'professional-service': 'productivity',
            'format-conversion': 'productivity',
            'tool-assistant': 'productivity',
            'template-generation': 'writing',
            'general': 'productivity',
            'all': 'productivity',
            'favorites': 'productivity'
        };
        const normalized = map[id] || id;
        return this.isValidCategoryId(normalized) ? normalized : null;
    }

    // Create new prompt
    async createPrompt(promptData) {
        try {
            // Avoid conflict with system reserved commands when generating command
            // OPTIMIZATION: Use fallback generation by default for speed. AI generation is too slow.
            let commandName = promptData.command || this.fallbackGenerateCommand(promptData.title);

            // Check if command conflicts with system reserved commands
            const systemReservedCommands = ['_']; // List of system reserved commands
            if (systemReservedCommands.includes(commandName)) {
                // If conflict, add suffix to avoid conflict
                commandName = `${commandName}-custom`;
                logger.debug(`⚠️ Command conflict detected "${commandName}", auto-adjusted to "${commandName}-custom"`);
            }

            const promptId = promptData.id || generateUUID();
            const categoryId = this.normalizeCategoryId(promptData.category); // No longer provide default value

            const newPrompt = {
                id: promptId,
                title: promptData.title,
                content: promptData.content,
                category: categoryId,
                description: promptData.description || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                usageCount: 0,
                isFavorite: false,
                command: commandName
            };

            // 1. Create to OpenWebUI API first
            let apiPayload = {
                command: `/${commandName}`,
                title: newPrompt.title,
                content: newPrompt.content,
                access_control: null
            };

            try {
                await this.api.createPrompt(apiPayload);
            } catch (error) {
                // If command already exists (400), try appending a random suffix
                if (error.message.includes('400') || error.message.includes('already registered')) {
                    logger.warn(`Command "/${commandName}" already exists, trying with suffix...`);
                    const suffix = Math.floor(Math.random() * 10000).toString();
                    commandName = `${commandName}-${suffix}`;
                    newPrompt.command = commandName; // Update prompt object
                    apiPayload.command = `/${commandName}`;

                    await this.api.createPrompt(apiPayload);
                    logger.debug(`✅ Prompt created successfully with suffix: ${commandName}`);
                } else {
                    throw error; // Re-throw other errors
                }
            }

            // 2. Add to in-memory prompt list
            this.prompts.push(newPrompt);

            // 3. Update metadata storage
            if (this.metadata && this.currentUser) {
                this.metadata.prompts[commandName] = {
                    categoryId: categoryId,
                    isFavorite: false,
                    usage: {
                        total: 0,
                        byUser: {}
                    },
                    createdBy: this.currentUser,
                    lastModifiedBy: this.currentUser,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Debounce save metadata
                this.saveData();
                this.saveDataToCache(); // Update cache immediately
            }

            logger.debug('✅ Prompt created successfully:', newPrompt.title);
            return newPrompt;
        } catch (error) {
            logger.error('❌ Failed to create prompt:', error);
            throw error;
        }
    }

    // Update prompt
    async updatePrompt(promptId, promptData) {
        try {
            const promptIndex = this.prompts.findIndex(p => p.id === promptId);
            if (promptIndex === -1) {
                throw new Error('Prompt does not exist');
            }

            const oldPrompt = this.prompts[promptIndex];
            // Use the new category if it's explicitly provided in promptData (even if null), otherwise keep the old one.
            const categoryId = this.normalizeCategoryId(
                'category' in promptData ? promptData.category : oldPrompt.category
            );
            const updatedPrompt = {
                ...oldPrompt,
                ...promptData,
                category: categoryId,
                updatedAt: new Date().toISOString()
            };

            // 1. Update OpenWebUI API first
            // OPTIMIZATION: Use fallback generation if command is missing.
            const command = updatedPrompt.command || this.fallbackGenerateCommand(updatedPrompt.title);
            const apiPayload = {
                command: `/${command}`,
                title: updatedPrompt.title,
                content: updatedPrompt.content,
                access_control: null
            };
            await this.api.updatePrompt(command, apiPayload);

            // 2. Update in-memory prompt list
            this.prompts[promptIndex] = updatedPrompt;

            // 3. Update metadata storage
            if (this.metadata && this.currentUser) {
                const metadataKey = command;
                if (this.metadata.prompts[metadataKey]) {
                    this.metadata.prompts[metadataKey].categoryId = categoryId;
                    this.metadata.prompts[metadataKey].lastModifiedBy = this.currentUser;
                    this.metadata.prompts[metadataKey].updatedAt = new Date().toISOString();
                } else {
                    // If metadata does not exist, create new
                    this.metadata.prompts[metadataKey] = {
                        categoryId: categoryId,
                        isFavorite: false,
                        usage: {
                            total: 0,
                            byUser: {}
                        },
                        createdBy: this.currentUser,
                        lastModifiedBy: this.currentUser,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                }

                // Debounce save metadata
                this.saveData();
                this.saveDataToCache(); // Update cache immediately
            }

            logger.debug('✅ Prompt updated successfully:', updatedPrompt.title);
            return this.prompts[promptIndex];
        } catch (error) {
            logger.error('❌ Failed to update prompt:', error);
            throw error;
        }
    }

    // Delete Prompt
    async deletePrompt(promptId) {
        try {
            const promptIndex = this.prompts.findIndex(p => p.id === promptId);
            if (promptIndex === -1) {
                throw new Error('Prompt does not exist');
            }

            const prompt = this.prompts[promptIndex];
            let command = prompt.command;

            // If no command, try to generate one
            if (!command) {
                command = await this.generateCommand(prompt.title);
            }

            // Ensure command format is correct (remove leading slash)
            command = command.replace(/^\/+/, '');

            // If command is empty, use promptId as command
            if (!command) {
                command = promptId.replace(/^openwebui_/, '');
            }

            // 1. Try to delete from OpenWebUI API first
            try {
                logger.debug(`🗑️ Attempting to delete OpenWebUI prompt, command: ${command}`);
                await this.api.deletePrompt(command);
                logger.debug('✅ Deleted from OpenWebUI API successfully');
            } catch (apiError) {
                logger.warn('⚠️ Failed to delete from OpenWebUI API:', apiError);

                // Check if it is a 404 error (prompt does not exist in API)
                if (apiError.message.includes('404') || apiError.message.includes('We could not find')) {
                    logger.debug('ℹ️ Prompt does not exist in OpenWebUI API, continuing to delete local record');
                } else {
                    // For other errors (e.g. 401), we still show warning but continue to delete local record
                    logger.warn('⚠️ API deletion encountered issue, but will continue to delete local record:', apiError.message);
                }
            }

            // 2. Delete prompt record from memory
            this.prompts.splice(promptIndex, 1);

            // 3. Delete relevant record from metadata
            if (this.metadata && this.metadata.prompts[command]) {
                delete this.metadata.prompts[command];
                // Debounce save metadata
                this.saveData();
                this.saveDataToCache(); // Update cache immediately
            }

            logger.debug(`✅ Prompt "${prompt.title}" deleted`);
            return true;

        } catch (error) {
            logger.error('❌ Failed to delete prompt:', error);
            throw error;
        }
    }

    // Get Prompts
    getPrompts() {
        return this.prompts;
    }

    // Get Prompt by ID
    getPromptById(id) {
        return this.prompts.find(p => p.id === id);
    }

    // Filter by Category
    getPromptsByCategory(categoryId) {
        if (categoryId === 'all') {
            return this.prompts;
        }
        return this.prompts.filter(p => p.category === categoryId);
    }

    // Search Prompts
    searchPrompts(query) {
        if (!query.trim()) {
            return this.prompts;
        }

        const lowerQuery = query.toLowerCase();
        return this.prompts.filter(p =>
            p.title.toLowerCase().includes(lowerQuery) ||
            p.content.toLowerCase().includes(lowerQuery) ||
            p.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    // Serialization function simplified, only used for export
    serialize() {
        const data = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            totalCount: this.prompts.length,
            categories: this.categories,
            prompts: this.prompts.map(p => ({
                id: p.id,
                title: p.title,
                content: p.content,
                category: p.category,
                tags: p.tags || [],
                usageCount: p.usageCount || 0,
                isFavorite: p.isFavorite || false,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                command: p.command,
                description: p.description || ''
            }))
        };
        return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }

    // Deserialize from JSON (Supports code block format)
    deserialize(jsonContent, silent = false) {
        const data = this.deserializeToData(jsonContent, silent);
        if (data) {
            this.prompts = data.prompts;
            this.categories = data.categories;
            if (!silent) {
                logger.debug('Loaded', this.prompts.length, 'prompts from JSON format');
            }
        }
    }

    // Deserialize to pure data object (No side effects)
    deserializeToData(jsonContent, silent = false) {
        try {
            let rawJson = jsonContent;
            if (jsonContent.includes('```json\n') && jsonContent.includes('\n```')) {
                const match = jsonContent.match(/```json\n([\s\S]*?)\n```/);
                rawJson = match ? match[1] : jsonContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
            }

            const data = JSON.parse(rawJson);

            if (data.prompts && Array.isArray(data.prompts)) {
                const prompts = data.prompts.map(p => ({
                    id: p.id || generateUUID(),
                    title: p.title || 'Untitled Prompt',
                    content: p.content || '',
                    category: this.normalizeCategoryId(p.category || 'productivity'),
                    tags: Array.isArray(p.tags) ? p.tags : [],
                    usageCount: parseInt(p.usageCount) || 0,
                    isFavorite: Boolean(p.isFavorite),
                    createdAt: p.createdAt || new Date().toISOString(),
                    updatedAt: p.updatedAt || new Date().toISOString(),
                    command: p.command || '',
                    description: p.description || ''
                }));
                return { prompts, categories: DEFAULT_CATEGORIES };
            }
        } catch (error) {
            if (!silent) {
                logger.warn('JSON format parse failed, trying CSV format:', error);
            }
            // Fallback to CSV format
            return this.deserializeCSVToData(jsonContent, silent);
        }
        return null;
    }

    // Deserialize CSV format to pure data (No side effects)
    deserializeCSVToData(csv, silent = false) {
        const lines = csv.split('\n');
        if (lines.length < 2) return null;

        const header = lines[0].split(',');
        const rows = lines.slice(1);

        const prompts = rows.map(row => {
            const values = row.match(/(".*?"|[^,]+)/g);
            if (!values) return null;

            const prompt = {};
            header.forEach((key, i) => {
                let value = values[i];
                if (value && value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1).replace(/""/g, '"');
                }
                if (key === 'tags') prompt[key] = value ? value.split(';') : [];
                else if (key === 'usageCount') prompt[key] = parseInt(value, 10) || 0;
                else if (key === 'isFavorite') prompt[key] = value === 'true';
                else prompt[key] = value || '';
            });
            // Normalize category ID
            prompt.category = this.normalizeCategoryId(prompt.category || 'productivity');
            return prompt;
        }).filter(Boolean);

        if (!silent) {
            logger.debug('Loaded', prompts.length, 'prompts from CSV format');
        }
        return { prompts, categories: DEFAULT_CATEGORIES };
    }

    // Deserialize CSV format (Backward compatibility)
    deserializeCSV(csv) {
        const lines = csv.split('\n');
        if (lines.length < 2) {
            this.prompts = this.getDefaultPrompts();
            return;
        }

        const header = lines[0].split(',');
        const rows = lines.slice(1);

        this.prompts = rows.map(row => {
            const values = row.match(/(".*?"|[^,]+)/g);
            if (!values) return null;

            const prompt = {};
            header.forEach((key, i) => {
                let value = values[i];
                if (value && value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1).replace(/""/g, '"');
                }

                if (key === 'tags') {
                    prompt[key] = value ? value.split(';') : [];
                } else if (key === 'usageCount') {
                    prompt[key] = parseInt(value, 10) || 0;
                } else if (key === 'isFavorite') {
                    prompt[key] = value === 'true';
                } else {
                    prompt[key] = value || '';
                }
            });
            return prompt;
        }).filter(Boolean);

        logger.debug('Loaded', this.prompts.length, 'prompts from CSV format');
    }

    // Get Default Prompts
    getDefaultPrompts() {
        // Return copy and normalize category, fill necessary fields
        return DEFAULT_PROMPTS.map(p => ({
            ...p,
            id: p.id || generateUUID(),
            title: p.title || 'Untitled Prompt',
            content: p.content || '',
            category: this.normalizeCategoryId(p.category || 'productivity')
        }));
    }

    // Update Usage Stats (Sync to central metadata storage)
    async updateUsageStats(promptId) {
        try {
            const prompt = this.prompts.find(p => p.id === promptId);
            if (prompt && this.metadata && this.currentUser) {
                // 1. Update in-memory stats
                prompt.usageCount = (prompt.usageCount || 0) + 1;
                prompt.updatedAt = new Date().toISOString();

                // 2. Update metadata storage stats
                const command = prompt.command || prompt.id;
                const metadata = this.metadata.prompts[command];

                if (metadata) {
                    metadata.usage.total = (metadata.usage.total || 0) + 1;
                    metadata.usage.byUser[this.currentUser.id] = (metadata.usage.byUser[this.currentUser.id] || 0) + 1;
                    metadata.updatedAt = new Date().toISOString();
                } else {
                    // If metadata does not exist, create new
                    this.metadata.prompts[command] = {
                        categoryId: prompt.category || 'productivity',
                        isFavorite: prompt.isFavorite || false,
                        usage: {
                            total: 1,
                            byUser: {
                                [this.currentUser.id]: 1
                            }
                        },
                        createdBy: this.currentUser,
                        lastModifiedBy: this.currentUser,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                }

                // 3. Debounce save metadata to avoid frequent writes
                this.saveData();
                logger.debug('📊 Prompt usage stats updated:', prompt.title, `(Total: ${metadata?.usage.total || 1}, User: ${metadata?.usage.byUser[this.currentUser.id] || 1})`);
            }
        } catch (error) {
            logger.warn('❌ Failed to update usage stats:', error);
        }
    }

    // Toggle Favorite (Sync to central metadata storage)
    async toggleFavorite(promptId) {
        try {
            const prompt = this.prompts.find(p => p.id === promptId);
            if (prompt && this.metadata && this.currentUser) {
                // 1. Update in-memory favorite status
                prompt.isFavorite = !prompt.isFavorite;
                prompt.updatedAt = new Date().toISOString();

                // 2. Update metadata storage favorite status
                const command = prompt.command || prompt.id;
                const metadata = this.metadata.prompts[command];

                if (metadata) {
                    metadata.isFavorite = prompt.isFavorite;
                    metadata.lastModifiedBy = this.currentUser;
                    metadata.updatedAt = new Date().toISOString();
                } else {
                    // If metadata does not exist, create new
                    this.metadata.prompts[command] = {
                        categoryId: prompt.category || 'productivity',
                        isFavorite: prompt.isFavorite,
                        usage: {
                            total: 0,
                            byUser: {}
                        },
                        createdBy: this.currentUser,
                        lastModifiedBy: this.currentUser,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                }

                // 3. Save metadata immediately (Favorite is important action)
                await this.saveMetadataStore();
                this.saveDataToCache(); // Update cache immediately
                logger.debug('⭐ Prompt favorite status updated:', prompt.title, prompt.isFavorite ? 'Favorited' : 'Unfavorited');
                return prompt.isFavorite;
            }
            return false;
        } catch (error) {
            logger.error('❌ Failed to toggle favorite status:', error);
            throw error;
        }
    }

    // Import Prompts (Merge into Note)
    async importPrompts(importData) {
        try {
            let importedCount = 0;
            let skippedCount = 0;

            if (Array.isArray(importData)) {
                // Directly prompt array
                for (const promptData of importData) {
                    const exists = this.prompts.some(p =>
                        p.id === promptData.id ||
                        p.title === promptData.title
                    );

                    if (!exists) {
                        const newPrompt = {
                            id: promptData.id || generateUUID(),
                            title: promptData.title || 'Untitled Prompt',
                            content: promptData.content || '',
                            category: this.normalizeCategoryId(promptData.category || 'productivity'),
                            category: this.normalizeCategoryId(promptData.category || 'productivity'),
                            tags: Array.isArray(promptData.tags) ? promptData.tags : [],
                            usageCount: parseInt(promptData.usageCount) || 0,
                            isFavorite: Boolean(promptData.isFavorite),
                            createdAt: promptData.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            command: promptData.command || '',
                            description: promptData.description || ''
                        };
                        this.prompts.push(newPrompt);
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                }
            } else if (importData.prompts && Array.isArray(importData.prompts)) {
                // Full data in JSON format
                for (const promptData of importData.prompts) {
                    const exists = this.prompts.some(p =>
                        p.id === promptData.id ||
                        p.title === promptData.title
                    );

                    if (!exists) {
                        const newPrompt = {
                            id: promptData.id || generateUUID(),
                            title: promptData.title || 'Untitled Prompt',
                            content: promptData.content || '',
                            category: this.normalizeCategoryId(promptData.category || 'productivity'),
                            tags: Array.isArray(promptData.tags) ? promptData.tags : [],
                            usageCount: parseInt(promptData.usageCount) || 0,
                            isFavorite: Boolean(promptData.isFavorite),
                            createdAt: promptData.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            command: promptData.command || '',
                            description: promptData.description || ''
                        };
                        this.prompts.push(newPrompt);
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                }

                // Merge categories (if any)
                if (importData.categories && Array.isArray(importData.categories)) {
                    const existingCategoryIds = this.categories.map(c => c.id);
                    const newCategories = importData.categories.filter(c => !existingCategoryIds.includes(c.id));
                    this.categories.push(...newCategories);
                }
            }

            if (importedCount > 0) {
                // Save to central metadata storage
                await this.saveMetadataStore();
                logger.debug(`Import completed: ${importedCount} new prompts, ${skippedCount} skipped`);
            }

            return { importedCount, skippedCount };
        } catch (error) {
            logger.error('Failed to import prompts:', error);
            throw error;
        }
    }

    // Export Prompts (Get latest data from Note)
    exportPrompts() {
        const data = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            totalCount: this.prompts.length,
            categories: this.categories,
            prompts: this.prompts
        };
        return data;
    }

    // Force reset central metadata storage (For debugging)
    async forceResetAndSyncDefaults() {
        logger.debug('🔄 Force resetting central metadata storage...');

        try {
            // 1. Reset in-memory data
            this.prompts = [];
            this.metadata = null;
            this.currentUser = null;
            logger.debug('📝 In-memory data cleared');

            // 2. Force reload and initialize
            await this.loadData();

            logger.debug('✅ Force reset completed!');
            return this.prompts.length;
        } catch (error) {
            logger.error('❌ Force reset failed:', error);
            throw error;
        }
    }

    // Force resync to API (Reset metadata and re-initialize)
    async forceResyncToAPI() {
        logger.debug('🔄 Force resyncing to API...');

        try {
            // 1. Delete existing metadata storage (if exists)
            // Note: We cannot delete directly, but re-initialize
            this.metadata = null;
            logger.debug('🗑️ Metadata reset');

            // 2. Reload data, this will re-initialize the whole system
            await this.loadData();

            logger.debug('✅ Force API resync completed!');
            return this.prompts.length;
        } catch (error) {
            logger.error('❌ Force resync failed:', error);
            throw error;
        }
    }

    // Sync only existing prompts to OpenWebUI API (No reset)
    async syncExistingToAPI() {
        logger.debug('🔄 Starting to sync existing prompts to OpenWebUI API...');
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < this.prompts.length; i++) {
            const prompt = this.prompts[i];
            try {
                const command = (prompt.command || prompt.id).replace(/^\/+/, '');
                const apiPayload = {
                    command: `/${command}`,
                    title: prompt.title,
                    content: prompt.content,
                    access_control: null,
                };

                logger.debug(`📤 [${i + 1}/${this.prompts.length}] Syncing: ${prompt.title} (Command: /${command})`);
                const result = await this.api.createPrompt(apiPayload);
                logger.debug(`✅ [${i + 1}/${this.prompts.length}] Sync successful:`, result);
                successCount++;
            } catch (apiError) {
                errorCount++;
                if (String(apiError.message).includes('409')) {
                    logger.warn(`⚠️ [${i + 1}/${this.prompts.length}] Prompt "${prompt.title}" already exists in OpenWebUI, skipping creation.`);
                } else {
                    logger.error(`❌ [${i + 1}/${this.prompts.length}] Failed to sync prompt "${prompt.title}" to OpenWebUI API:`, apiError);
                }
            }
        }

        logger.debug(`🎯 Existing prompts sync completed! Success: ${successCount}, Error: ${errorCount}`);
        return { successCount, errorCount };
    }
}
