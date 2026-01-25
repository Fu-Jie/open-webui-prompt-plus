logger.debug('--- PanelManager v1.2.0 --- Loading...');

import { generateUUID } from '../utils/helpers.js';
import { AIContentValidator } from '../core/ai-content-validator.js';
import { AIRetryManager } from '../core/ai-retry-manager.js';
import { SimpleSearch } from '../utils/simple-search.js';

import { ModelSelect } from './components/model-select.js';
import { i18n } from '../core/i18n.js';
import { logger } from '../core/logger.js';
import { AIGenerationPanel } from './panels/ai-generation-panel.js?v=FORCE_UPDATE_004';
import { EditorPanel } from './panels/editor-panel.js?v=FORCE_UPDATE_004';
import { QuickInsertPanel } from './panels/quick-insert-panel.js?v=FORCE_UPDATE_004';
import { ManagementPanel } from './panels/management-panel.js?v=FORCE_UPDATE_004';
import { PanelState } from './state/panel-state.js';
import { ScrollUtils } from './utils/scroll-utils.js';
import { DomUtils } from './utils/dom-utils.js';

// UI Panel Manager
export class PanelManager {
    constructor(promptManager, promptInserter, domManipulator) {
        logger.debug('[PanelManager] Constructor called');
        this.promptManager = promptManager;
        this.promptInserter = promptInserter;
        this.domManipulator = domManipulator;
        this.rootContainer = null; // The root element for all injected UI

        // Initialize State
        this.state = new PanelState();

        // Initialize Utils
        this.scrollUtils = new ScrollUtils();
        this.domUtils = new DomUtils();

        // AI Assistant Components
        this.aiValidator = new AIContentValidator();
        this.aiRetryManager = new AIRetryManager(promptManager.api);

        // Sub-panels
        this.aiGenerationPanel = new AIGenerationPanel(this);
        this.editorPanel = new EditorPanel(this);
        this.quickInsertPanel = new QuickInsertPanel(this);
        this.managementPanel = new ManagementPanel(this);

        // Bind global event listeners
        this.setupGlobalEventListeners();

        // Initialize simple search
        this.simpleSearch = null;
        this.useSimpleSearch = true; // Flag to use simple search
        // this.initializeSearchFeatures(); // <<< Delayed call in app.js

        // Initialize transparency settings
        // Initialize transparency settings
        this.initializeTransparencyControl();

        // Listen for global toast events
        window.addEventListener('pes:show-toast', (e) => {
            const { message, type } = e.detail;
            this.domUtils.showToast(message, type);
        });
    }

    // Delegate methods for backward compatibility and cleaner API
    toggleQuickInsertPanel() {
        i18n.sync();
        this.quickInsertPanel.toggle();
    }

    toggleManagementPanel() {
        i18n.sync();
        this.managementPanel.toggle();
    }

    closeQuickInsertPanel() {
        this.quickInsertPanel.close();
    }

    closeManagementPanel() {
        this.managementPanel.close();
    }

    closePromptModal() {
        this.editorPanel.close();
    }

    // Initialize search features (delegated)
    initializeSearchFeatures() {
        // Initialize simple search if needed
        if (this.useSimpleSearch && !this.simpleSearch) {
            this.simpleSearch = new SimpleSearch(this.promptManager.prompts);
            logger.debug('Simple search initialized');
        }
    }

    // Update lists (delegated)
    updatePromptList() {
        if (this.managementPanel) this.managementPanel.updatePromptList();
    }

    updateCategoryList() {
        if (this.managementPanel) this.managementPanel.updateCategoryList();
    }

    updateQuickPromptList() {
        if (this.quickInsertPanel) this.quickInsertPanel.updateList();
    }

    // Cycle through categories (for keyboard navigation)
    // Cycle through categories (for keyboard navigation)
    cycleCategory(direction, panelType) {
        logger.debug(`[CycleCategory] Direction: ${direction}, Panel: ${panelType}`);

        if (panelType === 'quick' && this.quickInsertPanel) {
            this.quickInsertPanel.cycleCategory(direction);
        } else if (panelType === 'management' && this.managementPanel) {
            this.managementPanel.cycleCategory(direction);
        }
    }

    updateQuickPanelCategories() {
        if (this.quickInsertPanel) this.quickInsertPanel.updateCategories();
    }

    navigateToManagementPanel() {
        this.closeQuickInsertPanel();
        this.toggleManagementPanel();
    }

    showVariableHelp() {
        this.editorPanel.showVariableHelp();
    }

    closeVariableHelp() {
        this.editorPanel.closeVariableHelp();
    }

    // Setup global event listeners
    setupGlobalEventListeners() {
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        // Close panel on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllPanels();
            }
        });

        // Adjust panel position on window resize
        window.addEventListener('resize', () => {
            this.adjustPanelPositions();
        });

        // Fallback: Intercept close/help in capture phase, supporting both id and data-action, intercepting in both pointerdown/click phases
        const attachTopCapture = (type) => {
            document.addEventListener(type, (e) => {
                const target = e.target;
                const isClose = (target.closest && (target.closest('#pes-quick-close-btn') || target.closest('[data-action="closeQuickInsertPanel"]')));
                // Only process close events if a panel is actually open
                // This prevents spurious close events during panel creation
                if (isClose && this.state.activePanel) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    this.closeAllPanels();
                    return;
                }
            }, true);
        };
        attachTopCapture('pointerdown');
        attachTopCapture('click');

        // Global navigation key forwarding, preventing page scroll from pushing the panel out of view
        // When focus is not inside the panel, forward keys like ArrowUp/Down/PgUp/PgDn/Home/End/Enter to the panel's keyboard navigation logic
        document.addEventListener('keydown', (e) => {
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Enter'];
            if (!navKeys.includes(e.key)) return;
            if (this.state.isModalOpen) return;

            let panelEl = null;
            if (this.state.activePanel === 'quick') {
                panelEl = document.getElementById('quick-insert-panel');
            } else if (this.state.activePanel === 'management') {
                panelEl = document.getElementById('prompt-management-panel');
            }
            if (!panelEl || panelEl.style.display === 'none') return;

            const insidePanel = panelEl.contains(e.target);
            if (!insidePanel) {
                // Prevent page scroll, hand over the event to the current panel's keyboard selection handler
                e.preventDefault();
                if (this.state.activePanel === 'quick' && panelEl._quickSelection && typeof panelEl._quickSelection.handleKeyDown === 'function') {
                    panelEl._quickSelection.handleKeyDown(e);
                } else if (this.state.activePanel === 'management' && panelEl._mgmtSelection && typeof panelEl._mgmtSelection.handleKeyDown === 'function') {
                    panelEl._mgmtSelection.handleKeyDown(e);
                }
            }
        }, true);
    }

    // Handle global click events
    handleGlobalClick(e) {
        // If it's an intentional help open event, skip one global close check
        if (this._suppressGlobalCloseOnce) {
            this._suppressGlobalCloseOnce = false;
            return;
        }
        // Get current active panel
        const quickPanel = document.getElementById('quick-insert-panel');
        const managementPanel = document.getElementById('prompt-management-panel');
        const triggerBtn = document.getElementById('prompt-manager-integrated-btn');
        const modal = document.getElementById('prompt-edit-modal');

        // If help modal is open, do not close quick/management panel on outside click, only handle help modal itself
        const helpModalGuard = document.getElementById('shortcut-help-modal');
        const helpVisibleGuard = helpModalGuard && helpModalGuard.classList.contains('is-visible');
        if (helpVisibleGuard) {
            const helpContent = helpModalGuard.querySelector('.prompt-modal-content');
            const isHelpTrigger = (e.target.closest && (e.target.closest('[data-action="toggleShortcutHelp"]') || e.target.closest('#pes-show-help-btn')));
            if (helpContent && !helpContent.contains(e.target) && !isHelpTrigger) {
                this.closeShortcutHelpModal();
            }
            return;
        }

        // Check if click is on the trigger button
        if (triggerBtn && triggerBtn.contains(e.target)) {
            return; // Let the button handle the click event
        }

        // Ignore clicks on elements that are no longer in the DOM (e.g. closed modals, deleted items)
        if (!e.target.isConnected) {
            return;
        }

        // Ignore clicks on our custom modal overlays
        if (e.target.closest('.pes-modal-overlay') || e.target.closest('.pes-message-overlay') || e.target.closest('.pes-confirm-overlay')) {
            return;
        }

        // Check if click is inside the quick panel
        if (quickPanel && quickPanel.style.display !== 'none') {
            if (!quickPanel.contains(e.target)) {
                this.quickInsertPanel.close();
            }
        }

        // Check if click is inside the management panel (but not inside any modal)
        if (managementPanel && managementPanel.style.display !== 'none') {
            const promptModal = document.getElementById('prompt-edit-modal');
            const categoryModal = document.getElementById('category-edit-modal');

            const isClickInPromptModal = promptModal && promptModal.classList.contains('is-visible') && promptModal.contains(e.target);
            const isClickInCategoryModal = categoryModal && categoryModal.classList.contains('is-visible') && categoryModal.contains(e.target);

            if (isClickInPromptModal || isClickInCategoryModal) {
                return; // Inside a modal, do not close the panel
            }

            if (!managementPanel.contains(e.target)) {
                this.managementPanel.close();
            }
        }

        // Check if click is outside the modal
        if (modal && modal.classList.contains('is-visible')) {
            const modalContent = modal.querySelector('.prompt-modal-content');
            // If the click target is a button that opens the modal (like edit or new), do not close
            const isModalTrigger = e.target.closest('[data-action="editPrompt"]') || e.target.closest('[data-action="createNewPrompt"]');

            if (modalContent && !modalContent.contains(e.target) && !isModalTrigger) {
                this.closePromptModal();
            }
        }


    }

    // Close all panels
    closeAllPanels() {
        logger.debug('[PanelManager] closeAllPanels called.');
        if (this.quickInsertPanel) this.quickInsertPanel.close();
        if (this.managementPanel) this.managementPanel.close();
        this.closePromptModal();
        this.state.activePanel = null; // Ensure active panel state is cleared
    }

    // Adjust panel positions (on window resize)
    adjustPanelPositions() {
        const quickPanel = document.getElementById('quick-insert-panel');
        const managementPanel = document.getElementById('prompt-management-panel');
        const triggerBtn = document.getElementById('prompt-manager-integrated-btn');

        // Adjust quick panel position
        if (quickPanel && quickPanel.style.display === 'block') {
            if (this.quickInsertPanel) this.quickInsertPanel.adjustPosition(quickPanel, triggerBtn);
        }
        // Adjust management panel position (centered)
        if (managementPanel && managementPanel.style.display === 'block') {
            this.adjustManagementPanelPosition(managementPanel);
        }
    }

    // Positioning handled by CSS transform, but keeping function for future use











    // Setup management panel event delegation (Refactored to clearer switch structure)


    // Create overlay


    // Remove overlay


    // Dynamically calculate and set page size to avoid scrolling


    // Toggle Quick Insert Panel - Create on demand


    // Toggle Management Panel - Create on demand


    // Close panel






    // Navigate to management panel


    closePromptModal() {
        this.editorPanel.close();
    }

    // Quick Insert Panel Keyboard Navigation: Tab cycles between Search -> Category -> List


    // General List Keyboard Navigation (Reused by Quick/Management panels)


    // Enable keyboard navigation for management panel (Reuse common logic)


    // Enable keyboard navigation for quick insert panel (Reuse common logic)




    // Quick Panel: Get category tabs


    // Quick Panel: Cycle categories



    // Update category tabs in quick panel


    // Filter quick prompts by category


    // Initialize search features (called after data and dependencies are loaded)
    initializeSearchFeatures() {
        if (!this.promptManager) return;

        try {
            // Initialize simple search
            this.simpleSearch = new SimpleSearch();
            this.simpleSearch.buildIndex(this.promptManager.prompts);
            logger.debug('Simple search initialized');
        } catch (error) {
            logger.error('Simple search initialization failed:', error);
            this.simpleSearch = null;
        }
    }

    // Rebuild search index (async optimized version)
    async rebuildSearchIndex() {
        logger.debug('🔄 Rebuilding search index...');

        if (!this.promptManager) {
            logger.warn('PromptManager unavailable, skipping index rebuild');
            return;
        }

        // For large datasets, use async rebuild to avoid blocking UI
        const promptCount = this.promptManager.prompts.length;
        const isLargeDataset = promptCount > 100; // Consider >100 prompts as large dataset

        if (isLargeDataset) {
            logger.debug(`📊 Large dataset detected (${promptCount} prompts), using async rebuild...`);
            return this.rebuildSearchIndexAsync();
        }

        // Small datasets use sync rebuild
        return this.rebuildSearchIndexSync();
    }

    // Sync rebuild search index (small dataset)
    rebuildSearchIndexSync() {
        if (this.useSimpleSearch) {
            // Rebuild simple search index
            this.initializeSimpleSearch();
        } else {
            // If search feature not initialized, initialize it
            this.initializeSearchFeatures();
        }
    }

    // Async rebuild search index (large dataset)
    async rebuildSearchIndexAsync() {
        logger.debug('🔄 Starting async search index rebuild...');

        // Show loading indicator (optional)
        this.showSearchRebuildIndicator();

        try {
            // Use requestIdleCallback or setTimeout to avoid blocking main thread
            await new Promise((resolve) => {
                const rebuildTask = () => {
                    try {
                        this.rebuildSearchIndexSync();
                        resolve();
                    } catch (error) {
                        logger.error('Async index rebuild failed:', error);
                        resolve(); // Continue even if failed
                    }
                };

                // Prefer requestIdleCallback, fallback to setTimeout
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(rebuildTask, { timeout: 2000 });
                } else {
                    setTimeout(rebuildTask, 10);
                }
            });

            logger.debug('✅ Async search index rebuild completed');
        } finally {
            // Hide loading indicator
            this.hideSearchRebuildIndicator();
        }
    }

    // Show search rebuild indicator
    showSearchRebuildIndicator() {
        // Show a small loading indicator near the search box
        const searchInput = document.querySelector('.quick-search, .main-search');
        if (!searchInput) return;

        let indicator = document.getElementById('search-rebuild-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'search-rebuild-indicator';
            indicator.style.cssText = `
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 12px;
                color: #666;
                pointer-events: none;
                z-index: 10;
            `;
            indicator.innerHTML = '🔄';
            searchInput.parentNode.style.position = 'relative';
            searchInput.parentNode.appendChild(indicator);
        }

        indicator.style.display = 'block';
    }

    // Hide search rebuild indicator
    hideSearchRebuildIndicator() {
        const indicator = document.getElementById('search-rebuild-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Initialize simple search feature
    initializeSimpleSearch() {
        logger.debug('Initializing simple search feature');

        // Create simple search index
        this.simpleSearchIndex = new Map();

        // Build inverted index
        this.promptManager.prompts.forEach(prompt => {
            const words = this.tokenizeText(prompt.title + ' ' + prompt.content);
            words.forEach(word => {
                if (!this.simpleSearchIndex.has(word)) {
                    this.simpleSearchIndex.set(word, []);
                }
                this.simpleSearchIndex.get(word).push(prompt.id);
            });
        });

        logger.debug(`Simple search index built, total ${this.simpleSearchIndex.size} terms`);
    }

    // Simple text tokenization
    tokenizeText(text) {
        return text.toLowerCase()
            .replace(/[^\w\u4e00-\u9fff]/g, ' ') // Keep Chinese characters
            .split(/\s+/)
            .filter(word => word.length > 0);
    }

    // Simple search implementation
    performSimpleSearch(query) {
        if (!query.trim()) return [];

        const queryWords = this.tokenizeText(query);
        const promptScores = new Map();

        // Calculate relevance score for each prompt
        queryWords.forEach(word => {
            const promptIds = this.simpleSearchIndex.get(word) || [];
            promptIds.forEach(promptId => {
                const currentScore = promptScores.get(promptId) || 0;
                promptScores.set(promptId, currentScore + 1);
            });
        });

        // Convert to result array and sort
        const results = Array.from(promptScores.entries())
            .map(([promptId, score]) => {
                const original = this.promptManager.prompts.find(p => p.id === promptId);
                if (original) {
                    const temp = { ...original };
                    temp._searchScore = score / queryWords.length; // Normalize score
                    return temp;
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => b._searchScore - a._searchScore);

        return results;
    }



    // Update quick prompt list


    // Update category list


    // Update prompt list


    // Insert prompt
    async insertPrompt(prompt) {
        // Always insert using command mode
        const success = await this.promptInserter.insertPrompt(prompt, 'command');
        if (success) {
            this.quickInsertPanel.close();
        }
    }

    // Search and Filter (Use simple search)







    // Prompt operations
    async toggleFavorite(promptId) {
        if (!this.promptManager) return;

        logger.debug('toggleFavorite called with promptId:', promptId);

        try {
            const result = await this.promptManager.toggleFavorite(promptId);
            logger.debug('toggleFavorite result:', result);

            // Update management panel list
            this.managementPanel.updatePromptList();
            // Update quick panel categories (show favorite count)
            this.quickInsertPanel.updateCategories();

            return result;
        } catch (error) {
            logger.error('Toggle favorite failed:', error);
            this.domUtils.showAlert(`${i18n.t('operation_failed')}${error.message}`);
        }
    }

    createNewPrompt() {
        this.editorPanel.openPromptModal();
    }

    editPrompt(promptId) {
        const promptObj = this.promptManager.prompts.find(p => p.id === promptId);
        if (promptObj) {
            this.editorPanel.openPromptModal(promptObj);
        }
    }

    savePrompt() {
        if (this.editorPanel) {
            this.editorPanel.savePrompt();
        }
    }



    // Resolve and fallback category, ensuring a valid category value always exists


    // Prefill manual form with generation result or external data, and sync preview
    prefillManualForm(data) {
        if (this.editorPanel) {
            this.editorPanel.prefillForm(data);
        }
    }










    async updatePromptCategory(promptId, categoryId, selectElement) {
        if (this.managementPanel) {
            await this.managementPanel.updatePromptCategory(promptId, categoryId);
        }
    }

    showTemporaryFeedback(element, message) {
        if (!element) return;
        const originalBorder = element.style.borderColor;
        element.style.borderColor = '#48bb78'; // Green border for success

        const feedback = document.createElement('span');
        feedback.className = 'temp-feedback';
        feedback.textContent = message;
        feedback.style.cssText = `
            color: #48bb78;
            font-size: 12px;
            margin-left: 8px;
            opacity: 1;
            transition: opacity 0.5s;
        `;

        element.parentNode.insertBefore(feedback, element.nextSibling);

        setTimeout(() => {
            feedback.style.opacity = '0';
            element.style.borderColor = originalBorder;
            setTimeout(() => feedback.remove(), 500);
        }, 1500);
    }

    openCategoryModal(category = null) {
        let modal = document.getElementById('category-edit-modal');
        if (!modal) {
            modal = this._createCategoryModal();
            this.rootContainer = this.domUtils.ensureRootContainer();
            this.rootContainer.appendChild(modal);
        }

        if (this.categoryModal) {
            this.categoryModal.open(category);
            this.state.isModalOpen = true;
        }
    }

    closeCategoryModal() {
        if (this.categoryModal) {
            this.categoryModal.close();
        }
        this.state.isModalOpen = false;
    }

    saveCategory(data) {
        // const form = document.getElementById('category-edit-form'); // No longer needed
        const id = data.id;
        const name = data.name;
        const icon = data.icon;
        const color = data.color;

        if (!name) {
            this.domUtils.showAlert(i18n.t('category_name_required'));
            return;
        }

        if (id) {
            // Update existing category in both metadata and the local list
            const categoryToUpdate = this.promptManager.metadata.categories.find(c => c.id === id);
            if (categoryToUpdate) {
                categoryToUpdate.name = name;
                categoryToUpdate.icon = icon || '📝';
                categoryToUpdate.color = color || '#a0aec0';
            }
            // also update the local list for immediate UI refresh
            const localCategory = this.promptManager.categories.find(c => c.id === id);
            if (localCategory) {
                localCategory.name = name;
                localCategory.icon = icon || '📝';
                localCategory.color = color || '#a0aec0';
            }
        } else {
            // Create new
            const newCategory = {
                id: generateUUID(),
                name: name,
                icon: icon || '📝',
                color: color || '#a0aec0',
                description: '',
                order: this.promptManager.categories.length + 1
            };
            // Add to both metadata and the local list
            this.promptManager.metadata.categories.push(newCategory);
            this.promptManager.categories.push(newCategory);
        }

        this.promptManager.saveData();
        this.promptManager.saveDataToCache(); // Explicitly save to cache
        this.managementPanel.updateCategoryList();
        this.quickInsertPanel.updateCategories();
        this.managementPanel.updatePromptList(); // Refresh prompt list to show new category info
        this.closeCategoryModal();
    }

    addNewCategory() {
        this.openCategoryModal();
    }

    // New: Edit category method
    editCategory(categoryId) {
        const category = this.promptManager.categories.find(c => c.id === categoryId);
        if (category) {
            this.openCategoryModal(category);
        }
    }

    // New: Delete category method
    deleteCategory(categoryId) {
        if (this.managementPanel) this.managementPanel.deleteCategory(categoryId);
    }

    // Toggle Import/Export
    toggleImportExport() {
        // This seems to be an old interaction, but if needed we can delegate or reimplement using ManagementPanel
        // For now, let's just open the management panel which has import/export buttons
        this.toggleManagementPanel();
    }

    exportPrompts() {
        if (this.managementPanel) this.managementPanel.exportPrompts();
    }

    importPrompts() {
        if (this.managementPanel) this.managementPanel.importPrompts();
    }

    // ==================== AI Assistant Features ====================

    // Update AI target category selector
    updateAITargetCategories() {
        const categorySelect = document.getElementById('ai-target-category');
        if (!categorySelect || !this.promptManager) return;

        // Clear existing options
        categorySelect.innerHTML = `<option value="">${i18n.t('category_name_placeholder')}</option>`;

        // Add all category options
        this.promptManager.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon} ${cat.name}`;
            categorySelect.appendChild(option);
        });
    }

    // AI Generate Prompt - Get input from UI
    async generateWithAI() {
        return this.aiGenerationPanel.generateWithAI();
    }

    // Delegate to AIGenerationPanel
    async _executeAIGeneration(userInput) {
        return this.aiGenerationPanel._executeAIGeneration(userInput);
    }

    displayAIResult(content, validation, hasErrors = false) {
        return this.aiGenerationPanel.displayAIResult(content, validation, hasErrors);
    }

    resetAIPanelState() {
        return this.aiGenerationPanel.resetAIPanelState();
    }

    showAIProgress(show) {
        return this.aiGenerationPanel.showAIProgress(show);
    }

    updateProgressStep(stepName, status) {
        return this.aiGenerationPanel.updateProgressStep(stepName, status);
    }

    showAIError(message) {
        return this.aiGenerationPanel.showAIError(message);
    }

    setGenerateButtonState(isLoading) {
        return this.aiGenerationPanel.setGenerateButtonState(isLoading);
    }

    _getVariableHelpMarkdown() {
        return this.aiGenerationPanel._getVariableHelpMarkdown();
    }

    // Internal core logic for executing AI generation
    async _executeAIGeneration(userInput) {
        logger.debug('[PanelManager] Executing AI generation with input:', userInput);
        // Reset UI state
        this.resetAIPanelState();

        // Show progress and disable button
        this.showAIProgress(true);
        this.updateProgressStep('generating', 'active');

        try {
            logger.debug('[PanelManager] Calling aiRetryManager.generateWithRetry...');
            const result = await this.aiRetryManager.generateWithRetry(
                userInput,
                (progress) => this.handleAIProgress(progress)
            );
            logger.debug('[PanelManager] Received result from aiRetryManager:', result);

            if (result.success) {
                this.displayAIResult(result.content, result.validation);
                this.state.currentAIGeneration = result.content;
            } else {
                if (result.content && result.canManualEdit) {
                    this.displayAIResult(result.content, result.validation, true);
                    this.state.currentAIGeneration = result.content;
                } else {
                    this.showAIError(result.error || i18n.t('generation_failed_retry'));
                }
            }
        } catch (error) {
            logger.error('[PanelManager] AI Generation Exception:', error);
            this.showAIError(`${i18n.t('generation_error')}${error.message}`);
        } finally {
            this.setGenerateButtonState(false); // Ensure button state is reset in all cases
        }
    }

    // Handle AI generation progress
    handleAIProgress(progress) {
        const { stage, attempt, message, errors, warnings, score } = progress;

        // Update progress step
        this.updateProgressStep(stage, 'active');

        // Update progress message
        const messageEl = document.getElementById('progress-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        // Update details
        const detailsEl = document.getElementById('progress-details');
        if (detailsEl) {
            let details = '';
            if (attempt) {
                details += `Attempt ${attempt}`;
            }
            if (errors && errors.length > 0) {
                details += `\nErrors: ${errors.slice(0, 2).join(', ')}`;
            }
            if (warnings && warnings.length > 0) {
                details += `\nWarnings: ${warnings.slice(0, 2).join(', ')}`;
            }
            if (score !== undefined) {
                details += `\nScore: ${Math.round(score * 100)}%`;
            }
            detailsEl.textContent = details.trim();
        }

        // Update step status based on stage
        switch (stage) {
            case 'generating':
                this.resetProgressSteps();
                this.updateProgressStep('generating', 'active');
                break;
            case 'validating':
                this.updateProgressStep('generating', 'completed');
                this.updateProgressStep('validating', 'active');
                break;
            case 'retrying':
                this.updateProgressStep('validating', 'warning');
                this.updateProgressStep('retrying', 'active');
                break;
            case 'completed':
                this.updateProgressStep('retrying', 'completed');
                this.updateProgressStep('completed', 'completed');
                break;
            case 'failed':
                this.updateProgressStep(stage.replace('step-', ''), 'error');
                break;
        }
    }

    // Display AI Result
    displayAIResult(content, validation, hasErrors = false) {
        logger.debug('[PanelManager] displayAIResult: Starting UI update.', { content, validation });
        // Hide progress
        this.showAIProgress(false);

        const aiPanel = document.getElementById('ai-assistant-panel');
        if (!aiPanel) {
            logger.error('[PanelManager] displayAIResult: AI assistant panel not found!');
            return;
        }

        // --- "Nuke and Rebuild" Strategy ---
        // 1. Remove old validation result panel (if exists)
        const oldResultPanel = document.getElementById('validation-result');
        if (oldResultPanel) {
            logger.debug('[PanelManager] displayAIResult: Removing old result panel.');
            oldResultPanel.remove();
        }

        // 2. Create a brand new validation result panel
        const newResultPanel = document.createElement('div');
        newResultPanel.id = 'validation-result';
        newResultPanel.className = 'validation-result';
        logger.debug('[PanelManager] displayAIResult: Created new result panel element.');

        // 3. Fill new panel content
        // 3a. Create generated content preview area
        const contentPreview = document.createElement('div');
        contentPreview.className = 'ai-generated-preview';
        // Sanitize content before setting innerHTML
        const sanitizedTitle = this.sanitizeHTML(content.title || i18n.t('untitled'));
        const sanitizedContent = this.sanitizeHTML(content.content || i18n.t('no_content')).replace(/\n/g, '<br>');
        const sanitizedCategory = this.sanitizeHTML(content.category || '');
        const sanitizedCommand = this.sanitizeHTML(content.command || '');

        contentPreview.innerHTML = `
            <h5>${i18n.t('generated_preview_title')}</h5>
            <div class="preview-title">
                <strong>${i18n.t('title_label')}</strong>${sanitizedTitle}
            </div>
            <div class="preview-content">
                <div class="content-label"><strong>${i18n.t('content_label')}</strong></div>
                <div class="content-text">${sanitizedContent}</div>
            </div>
            ${sanitizedCategory ? `<div class="preview-category"><strong>${i18n.t('category_label')}</strong>${sanitizedCategory}</div>` : ''}
            ${sanitizedCommand ? `<div class="preview-command"><strong>${i18n.t('command_label')}</strong>/${sanitizedCommand}</div>` : ''}
        `;
        newResultPanel.appendChild(contentPreview);

        // 3b. Create quality score area
        const scoreSection = document.createElement('div');
        scoreSection.className = 'validation-score';
        const score = Math.round(validation.score * 100);
        scoreSection.innerHTML = `
            <span class="score-label">${i18n.t('quality_score_label')}</span>
            <span class="score-value ${score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'poor'}">${score}%</span>
        `;
        newResultPanel.appendChild(scoreSection);

        // 3c. Create details area
        const detailsSection = document.createElement('div');
        detailsSection.className = 'validation-details';
        let detailsText = '';
        if (validation.errors && validation.errors.length > 0) {
            detailsText += `${i18n.t('errors_label')} (${validation.errors.length}):\n${validation.errors.slice(0, 3).join('\n')}\n\n`;
        }
        if (validation.warnings && validation.warnings.length > 0) {
            detailsText += `${i18n.t('warnings_label')} (${validation.warnings.length}):\n${validation.warnings.slice(0, 3).join('\n')}\n\n`;
        }
        if (validation.suggestions && validation.suggestions.length > 0) {
            detailsText += `${i18n.t('suggestions_label')} (${validation.suggestions.length}):\n${validation.suggestions.slice(0, 3).join('\n')}`;
        }
        detailsSection.textContent = detailsText.trim() || i18n.t('content_meets_requirements');
        newResultPanel.appendChild(detailsSection);

        // 3d. Create action buttons area
        const actionsSection = document.createElement('div');
        actionsSection.className = 'validation-actions';
        actionsSection.innerHTML = `
            <button type="button" class="btn-success" data-action="acceptAIResult">${i18n.t('accept_result')}</button>
            <button type="button" class="btn-warning" data-action="retryGeneration">${i18n.t('regenerate')}</button>
            <button type="button" class="btn-info" data-action="manualEdit">${i18n.t('manual_edit')}</button>
        `;
        newResultPanel.appendChild(actionsSection);

        const helperNote = document.createElement('div');
        helperNote.className = 'validation-hint';
        helperNote.textContent = i18n.t('synced_to_form_hint');
        newResultPanel.appendChild(helperNote);

        // 4. Append the brand new panel to the end of AI assistant
        aiPanel.appendChild(newResultPanel);
        logger.debug('[PanelManager] displayAIResult: Appended new result panel to AI assistant panel.');

        // 5. Rebind events
        this.scrollUtils.attachWheelScrollLock(newResultPanel);
        this.rebindValidationActions(newResultPanel);

        // 6. Auto scroll to result area
        this.scrollToAIResult();

        // 7. Prefill generated result to manual form for direct save/preview
        this.prefillManualForm(content);

        logger.debug('[PanelManager] displayAIResult: UI update process finished.');
    }

    // Accept AI Result
    async acceptAIResult() {
        if (!this.state.currentAIGeneration) return;

        try {
            // Directly save AI generated prompt
            const content = this.state.currentAIGeneration;
            const resolvedCategory = this.resolveCategory(content.category);
            const promptData = {
                title: content.title || '',
                content: content.content || '',
                category: resolvedCategory,
                access_control: null,
            };

            // Call save method
            await this.promptManager.createPrompt(promptData);

            // Update list
            this.managementPanel.updatePromptList();
            this.managementPanel.updateCategoryList();

            // Close modal
            this.closePromptModal();

            // Show success message
            alert(i18n.t('ai_prompt_saved'));

        } catch (error) {
            logger.error('Failed to save AI generated prompt:', error);
            alert(`${i18n.t('save_failed')}${error.message}`);
        }
    }

    // Regenerate
    retryGeneration() {
        logger.debug('[PanelManager] retryGeneration called.');
        if (this.state.lastAIUserInput) {
            logger.debug('[PanelManager] Retrying with last input:', this.state.lastAIUserInput);
            // Create a deep copy to avoid original input being modified by ai-retry-manager
            const inputCopy = JSON.parse(JSON.stringify(this.state.lastAIUserInput));
            logger.debug('[PanelManager] Created deep copy for retry:', inputCopy);
            this._executeAIGeneration(inputCopy);
        } else {
            alert(i18n.t('no_retry_record'));
            logger.error('[PanelManager] Retry failed: lastAIUserInput is null.');
        }
    }

    // Manual Edit
    manualEdit() {
        if (this.state.currentAIGeneration) {
            this.prefillManualForm(this.state.currentAIGeneration);
        }

        // Switch to manual edit mode
        this.toggleManualMode();

        // Hide validation result
        const validationResult = document.getElementById('validation-result');
        if (validationResult) {
            validationResult.style.display = 'none';
        }
    }

    // Use Template
    async useTemplate() {
        const scenario = document.getElementById('ai-scenario').value;
        const description = document.getElementById('ai-description').value.trim();

        try {
            const template = await this.promptManager.api.generateScenarioTemplate(scenario, description);

            // Fill form
            document.getElementById('prompt-edit-title').value = template.title || '';
            document.getElementById('prompt-edit-content').value = template.content || '';

            if (template.category) {
                const categorySelect = document.getElementById('prompt-edit-category');
                if (categorySelect) {
                    categorySelect.value = template.category;
                }
            }

            // Switch to manual edit
            this.toggleAIMode();

        } catch (error) {
            logger.error('Failed to fetch template:', error);
            alert(`${i18n.t('get_template_failed')}${error.message}`);
        }
    }

    // Show/Hide AI progress and manage button state
    showAIProgress(show) {
        const progressEl = document.getElementById('ai-progress');
        if (progressEl) {
            progressEl.style.display = show ? 'block' : 'none';
        }
        this.setGenerateButtonState(show);
    }

    // Reset progress steps
    resetProgressSteps() {
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => {
            step.className = 'step';
        });
    }

    // Update progress step
    updateProgressStep(stepName, status) {
        const step = document.getElementById(`step-${stepName}`);
        if (step) {
            step.className = `step ${status}`;
        }
    }

    // Show AI Error
    showAIError(message) {
        this.showAIProgress(false); // This calls setGenerateButtonState(false)

        const progressEl = document.getElementById('ai-progress');
        if (progressEl) progressEl.style.display = 'block'; // Keep progress bar visible to show error

        const progressMessage = document.getElementById('progress-message');
        if (progressMessage) {
            progressMessage.textContent = `❌ ${message}`;
            progressMessage.style.color = '#e53e3e';
        }
    }

    // Show variable help


    // Close variable help




    // Simple HTML sanitize function
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // ==================== Model Selection Feature ====================

    // Load available models (Using ModelSelect component)
    async loadAvailableModels() {
        logger.debug('[ModelSelect] 🚀 loadAvailableModels called');

        // Prevent duplicate calls
        if (this._modelLoading) {
            logger.debug('[ModelSelect] ⏳ Already loading, skipping');
            logger.debug('[ModelSelect] Already loading, skipping.');
            return;
        }

        const container = document.getElementById('ai-model-select-container');
        if (!container) {
            logger.warn('[ModelSelect] AI model select container not found.');
            return;
        }

        // Check if container has changed (e.g. modal recreated due to language switch)
        // If so, we must re-initialize the component attached to the new container
        if (this.modelSelect && this.modelSelect.container !== container) {
            logger.debug('[ModelSelect] Container changed, resetting component.');
            this.modelSelect = null;
        }

        // If component already initialized and has data, skip
        if (this.modelSelect && this.modelSelect.models && this.modelSelect.models.length > 0) {
            logger.debug('[ModelSelect] Model data already loaded, skipping.');
            return;
        }

        this._modelLoading = true;

        try {
            // Initialize component (if needed)
            if (!this.modelSelect) {
                this.modelSelect = new ModelSelect(container, {
                    placeholder: i18n.t('search_select_model_placeholder'),
                    onSelect: (model) => {
                        this.handleModelChange(model.id);
                    }
                });
            }

            // Load data
            await this._loadModelData();
        } finally {
            this._modelLoading = false;
        }
    }

    // Internal method: Load model data
    async _loadModelData() {
        if (!this.modelSelect) {
            logger.warn('[ModelSelect] Component not initialized');
            return;
        }

        try {
            logger.debug('[ModelSelect] Starting model load...');
            this.modelSelect.setLoading(true);

            // Check if API is available
            if (!this.promptManager || !this.promptManager.api) {
                logger.error('[ModelSelect] API unavailable', {
                    promptManager: !!this.promptManager,
                    api: !!(this.promptManager?.api)
                });
                throw new Error(i18n.t('ai_api_unavailable'));
            }

            // Get available models
            logger.debug('[ModelSelect] Calling getAvailableModels...');
            const models = await this.promptManager.api.getAvailableModels();
            logger.debug('[ModelSelect] Got models:', models?.length);

            if (models && Array.isArray(models) && models.length > 0) {
                this.modelSelect.setModels(models);

                // Set currently selected model
                try {
                    const currentModel = await this.promptManager.api.getCurrentModel();
                    logger.debug('[ModelSelect] Current model:', currentModel);
                    if (currentModel) {
                        this.modelSelect.setSelected(currentModel);
                    }
                } catch (e) {
                    logger.warn('[ModelSelect] Failed to get current model:', e);
                }

                logger.debug(`[ModelSelect] ✅ Loaded ${models.length} available models`);
            } else {
                logger.warn('[ModelSelect] No available models found');
                this.modelSelect.setError(i18n.t('no_models_available'));
            }

        } catch (error) {
            logger.error('[ModelSelect] Load failed:', error);
            this.modelSelect.setError(i18n.t('load_failed_refresh'));
        } finally {
            this.modelSelect.setLoading(false);
        }
    }

    // Format model display name
    formatModelDisplayName(model) {
        const modelId = model.id || model.model || i18n.t('unknown_model');
        const modelName = model.name || modelId;

        // Add extra info
        let displayName = modelName;

        // Add provider info
        if (model.owned_by && model.owned_by !== 'system') {
            displayName += ` (${model.owned_by})`;
        }

        // Add status flag
        if (model.is_active === false) {
            displayName += ` [${i18n.t('offline')}]`;
        }

        // Add model type flag
        if (modelId.includes('gpt-4')) {
            displayName = '🤖 ' + displayName;
        } else if (modelId.includes('gpt-3.5')) {
            displayName = '💬 ' + displayName;
        } else if (modelId.includes('gemini')) {
            displayName = '✨ ' + displayName;
        } else if (modelId.includes('claude')) {
            displayName = '🎭 ' + displayName;
        } else if (modelId.includes('llama')) {
            displayName = '🦙 ' + displayName;
        } else {
            displayName = '🔧 ' + displayName;
        }

        return displayName;
    }

    // Handle model selection change
    handleModelChange(selectedModelId) {
        if (!selectedModelId || selectedModelId === 'retry') {
            return;
        }

        try {
            logger.debug(`[PanelManager] 💾 Save model selection: ${selectedModelId}`);
            // Save user selected model to localStorage
            localStorage.setItem('selectedModel', selectedModelId);

            // Verify save success
            const saved = localStorage.getItem('selectedModel');
            logger.debug(`[PanelManager] ✅ Verify localStorage: ${saved}`);

            // Update AI API config
            if (this.promptManager && this.promptManager.api) {
                // Can update API instance current model setting here
                logger.debug(`[PanelManager] Switched to model: ${selectedModelId}`);

                // Show switch success notification - Removed as per user request
                // this.showModelChangeSuccess(selectedModelId);
            }

        } catch (error) {
            logger.error('[PanelManager] Failed to switch model:', error);
            alert(`Failed to switch model: ${error.message}`);
        }
    }

    // Show model switch success notification
    showModelChangeSuccess(modelId) {
        // Create temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
        `;

        notification.innerHTML = `✅ ${i18n.t('switched_to')}${this.getSimpleModelName(modelId)}`;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 3000);
    }

    // Get simplified model name
    getSimpleModelName(modelId) {
        // Remove common prefixes and suffixes, return simplified name
        return modelId
            .replace(/^(openai\/|anthropic\/|google\/|meta\/|mistral\/)/, '')
            .replace(/(-instruct|-chat|-completion)$/, '')
            .replace(/^gpt-/, 'GPT-')
            .replace(/^claude-/, 'Claude ')
            .replace(/^gemini-/, 'Gemini ')
            .replace(/^llama-/, 'Llama ');
    }


    // Get currently selected model
    getCurrentSelectedModel() {
        return this.modelSelect ? this.modelSelect.getSelectedId() : null;
    }

    // Set selected model
    setSelectedModel(modelId) {
        if (this.modelSelect) {
            this.modelSelect.setSelected(modelId);
            this.handleModelChange(modelId);
        }
    }

    // Rebind validation result button events
    rebindValidationActions(resultPanel) {
        const buttons = resultPanel.querySelectorAll('[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = button.dataset.action;
                const handler = this[action];

                if (typeof handler === 'function') {
                    logger.debug(`Executing validation action: ${action}`);
                    handler.call(this);
                } else {
                    logger.warn(`Handler not found for action: ${action}`);
                }
            });
        });
    }

    // Scroll to AI generation result
    scrollToAIResult() {
        setTimeout(() => {
            const resultPanel = document.getElementById('validation-result');
            const modalContent = document.querySelector('.prompt-modal-content');

            if (resultPanel && modalContent) {
                // Scroll inside modal
                const modalRect = modalContent.getBoundingClientRect();
                const resultRect = resultPanel.getBoundingClientRect();

                // Calculate scroll position, ensure result panel is in viewport center
                const scrollTop = resultRect.top - modalRect.top + modalContent.scrollTop - 100;

                modalContent.scrollTo({
                    top: Math.max(0, scrollTop),
                    behavior: 'smooth'
                });

                logger.debug('Auto-scrolling to AI generation result');
            } else {
                // Fallback: Page level scroll
                const resultPanel = document.getElementById('validation-result');
                if (resultPanel) {
                    resultPanel.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
        }, 200); // Slight delay to ensure DOM update complete
    }

    // Reset AI panel state
    resetAIPanelState() {
        this.state.currentAIGeneration = null;

        // "Nuke" part of the strategy: remove the panel instead of hiding it.
        const validationResult = document.getElementById('validation-result');
        if (validationResult) {
            validationResult.remove();
        }

        const aiProgress = document.getElementById('ai-progress');
        if (aiProgress) {
            aiProgress.style.display = 'none';
        }

        this.setGenerateButtonState(false); // Use new state management function
    }

    // Unified management of generate button state
    setGenerateButtonState(isLoading) {
        const generateBtn = document.querySelector('[data-action="generateWithAI"]');
        if (generateBtn) {
            generateBtn.disabled = isLoading;
            const btnText = generateBtn.querySelector('.btn-text');
            const btnLoading = generateBtn.querySelector('.btn-loading');

            if (btnText) {
                btnText.style.display = isLoading ? 'none' : 'inline';
            }
            if (btnLoading) {
                btnLoading.style.display = isLoading ? 'inline' : 'none';
            }
        }
    }



    // Secondary calibration: Ensure current page fits container perfectly, no scrolling
    // _ensureQuickPageFits moved to QuickInsertPanel



    // Shortcut Help Modal removed as per user request



    // ==================== Transparency Control ====================

    initializeTransparencyControl() {
        const savedOpacity = localStorage.getItem('panelOpacity') || '0.95'; // Default value
        this.updateTransparency(savedOpacity);
    }

    updateTransparency(opacity) {
        // Update CSS variables, slightly reduce opacity in light mode to ensure readability
        document.documentElement.style.setProperty('--panel-opacity-light', opacity * 0.85);
        document.documentElement.style.setProperty('--panel-opacity-dark', opacity);
        localStorage.setItem('panelOpacity', opacity);

        // If slider exists, sync its value
        const slider = document.getElementById('opacity-slider');
        if (slider && slider.value !== opacity) {
            slider.value = opacity;
        }
    }

    setupOpacitySlider(panel) {
        const slider = panel.querySelector('#opacity-slider');
        if (slider) {
            slider.value = localStorage.getItem('panelOpacity') || '0.95';
            slider.addEventListener('input', (e) => {
                this.updateTransparency(e.target.value);
            });
        }
    }

    // Generate Variable Help Markdown
    // _getVariableHelpMarkdown moved to EditorPanel
}