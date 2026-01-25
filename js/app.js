// Main Application Entry File
import { CONFIG, KEYBOARD_SHORTCUTS } from './core/constants.js';
import { i18n } from './core/i18n.js';
import { DOMManipulator } from './core/dom-manipulator.js';
import { PromptManager } from './core/prompt-manager.js?v=FORCE_UPDATE_001';
import { SyncService } from './services/sync-service.js';
import { SmartInputDetector } from './core/input-detector.js';
import { MultiStrategyInserter, EnhancedPromptInserter } from './core/text-inserter.js';
import { PanelManager } from './ui/panel-manager.js?v=FORCE_UPDATE_001';
import { logger } from './core/logger.js';
// Remove module import, use global Promise

// Main Application Class
class LoaderApp {
    constructor() {
        this.version = '0.1.0';
        console.log(`%c 🚀 Open WebUI Prompt Plus v${this.version} %c https://github.com/fujie/open-webui-prompt-plus `, 'background: #667eea; color: #fff; border-radius: 3px 0 0 3px; padding: 2px 5px; font-weight: bold;', 'background: #764ba2; color: #fff; border-radius: 0 3px 3px 0; padding: 2px 5px;');
        this.initialized = false;
        this.buttonCreated = false;
        this.domManipulator = new DOMManipulator();
        this.promptManager = null;
        this.inputDetector = null;
        this.textInserter = null;
        this.promptInserter = null;
        this.panelManager = null;

        // Initialization Flags
        this.placeholderSet = false;

        // Performance Optimization Cache
        this.targetContainerCache = null;
        this.lastContainerCheck = 0;
        this.containerCheckInterval = 250; // 250ms cache

        // Deferred Initialization Queue
        this.initializationQueue = [];
        this.isInitializing = false;
    }

    // Fast Initialize - Create only necessary components (and provide immediately interactive lightweight instances)
    fastInitialize() {
        if (!this.domManipulator) {
            this.domManipulator = new DOMManipulator();
        }

        // Lightweight instance: Can open panel immediately, without waiting for data load
        if (!this.inputDetector) {
            this.inputDetector = new SmartInputDetector();
        }
        if (!this.textInserter) {
            this.textInserter = new MultiStrategyInserter();
        }
        if (!this.promptManager) {
            // Do not trigger network, only construct object; data loaded later by fullInitialize
            this.promptManager = new PromptManager();
        }
        if (!this.promptInserter) {
            this.promptInserter = new EnhancedPromptInserter(this.inputDetector, this.textInserter);
        }
        if (!this.panelManager) {
            this.panelManager = new PanelManager(this.promptManager, this.promptInserter, this.domManipulator);
        }

        // Set global references to ensure shortcuts work
        window.promptManager = this.promptManager;
        window.panelManager = this.panelManager;
        window.loaderApp = this;

        // Mark fast initialization as complete
        this.buttonCreated = true;
    }

    // Full Initialize - Lazy load heavyweight components
    async fullInitialize() {
        if (this.initialized || this.isInitializing) return;

        this.isInitializing = true;

        try {
            // Lazy initialize heavyweight components
            if (!this.inputDetector) {
                this.inputDetector = new SmartInputDetector();
            }

            if (!this.textInserter) {
                this.textInserter = new MultiStrategyInserter();
            }

            if (!this.promptManager) {
                this.promptManager = new PromptManager();
            }

            if (!this.promptInserter) {
                this.promptInserter = new EnhancedPromptInserter(this.inputDetector, this.textInserter);
            }

            // PanelManager instantiation is early, but its internal data dependency initialization is deferred
            if (!this.panelManager) {
                this.panelManager = new PanelManager(this.promptManager, this.promptInserter, this.domManipulator);
            }

            if (!this.syncService) {
                this.syncService = new SyncService(this.promptManager);
            }

            // Define a callback function to refresh UI components when prompt data updates
            const onPromptsUpdate = (freshPrompts) => {
                logger.debug('SWR Callback: Prompts updated, refreshing UI components...');
                if (this.panelManager) {
                    // Re-initialize search features with new data
                    this.panelManager.initializeSearchFeatures();

                    // Update all relevant UI parts
                    if (this.panelManager.managementPanel) {
                        this.panelManager.managementPanel.updatePromptList();
                        this.panelManager.managementPanel.updateCategoryList();
                    }
                    if (this.panelManager.quickInsertPanel) {
                        this.panelManager.quickInsertPanel.updateList();
                        this.panelManager.quickInsertPanel.updateCategories();
                    }
                }
            };

            // Start data loading process
            await this.promptManager.loadData(onPromptsUpdate);

            // Initialize search features once with initial cached data (stale data)
            if (this.panelManager) {
                this.panelManager.initializeSearchFeatures();
            }

            // Start background sync service
            this.syncService.start();

            // Set global references
            window.promptManager = this.promptManager;
            window.panelManager = this.panelManager;
            window.loaderApp = this;

            this.initialized = true;
            this.isInitializing = false;

            logger.debug('LoaderApp fully initialized');

            // Process initialization queue
            this.processInitializationQueue();

        } catch (error) {
            logger.error('LoaderApp full initialization failed:', error);
            this.isInitializing = false;
        }
    }

    // Async data loading - This method is now replaced by Promise.all in fullInitialize
    // But kept in case it is called elsewhere
    async loadDataAsync() {
        try {
            if (this.promptManager) {
                await this.promptManager.loadData();
            }
        } catch (error) {
            logger.warn('Async data load failed:', error);
        }
    }

    // Process initialization queue
    processInitializationQueue() {
        while (this.initializationQueue.length > 0) {
            const callback = this.initializationQueue.shift();
            try {
                callback();
            } catch (error) {
                logger.warn('Failed to process initialization queue:', error);
            }
        }
    }

    // Add to initialization queue
    addToInitializationQueue(callback) {
        if (this.initialized) {
            callback();
        } else {
            this.initializationQueue.push(callback);
        }
    }

    // Compatible with old initialization method
    async initialize() {
        await this.fullInitialize();
    }

    // Setup Enhanced Prompt Manager - Performance Optimized and Self-Healing Version
    async setupEnhancedPromptManager() {
        // Removed window.promptManagerInitialized check, changed to check button existence every time

        // Use the new robust finder directly
        const targetContainer = this.domManipulator.findTargetContainer();

        // Core logic: Recreate as long as container exists but button does not
        if (targetContainer && !document.getElementById('prompt-manager-integrated-btn')) {

            // Fast initialization, executed only on first creation
            if (!this.buttonCreated) {
                this.fastInitialize();
            }

            // Cleanup potential old elements (just in case)
            this.domManipulator.cleanupExistingElements();

            // Create and integrate button
            const button = this.domManipulator.createIntegratedButton(targetContainer);

            // Bind events
            this.bindFastButtonEvents(button);

            // Schedule full initialization only after successful first button creation
            if (!this.initialized && !this.isInitializing) {
                this.scheduleFullInitialization();
            }
        }
    }

    // Get cached target container
    getCachedTargetContainer() {
        const now = Date.now();

        // If cache is valid, return directly
        if (this.targetContainerCache &&
            (now - this.lastContainerCheck) < this.containerCheckInterval) {
            return this.targetContainerCache;
        }

        // Re-find and cache
        this.targetContainerCache = this.domManipulator.findTargetContainer();
        this.lastContainerCheck = now;

        return this.targetContainerCache;
    }

    // Schedule full initialization
    scheduleFullInitialization() {
        if (this.initialized || this.isInitializing) return;
        // Use requestIdleCallback to initialize when browser is idle (reduce timeout)
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                this.fullInitialize();
            }, { timeout: 0 });
        } else {
            // Fallback: Schedule as soon as possible
            setTimeout(() => {
                this.fullInitialize();
            }, 0);
        }
    }

    // Fast button event binding
    bindFastButtonEvents(button) {
        const handler = (e, action) => {
            e.preventDefault();
            e.stopPropagation();

            // Unified event handling logic
            const executeAction = () => {
                if (this.panelManager) {
                    if (action === 'toggleQuick') {
                        this.panelManager.toggleQuickInsertPanel();
                    } else if (action === 'toggleManagement') {
                        this.panelManager.toggleManagementPanel();
                    }
                }
            };

            if (this.initialized) {
                executeAction();
            } else {
                // Fast path: Open panel immediately (using lightweight instance), and complete full initialization in parallel
                if (!this.panelManager) {
                    this.fastInitialize();
                }
                executeAction();
                if (!this.isInitializing) {
                    this.fullInitialize();
                }
            }
        };

        button.onclick = (e) => handler(e, 'toggleQuick');
        button.oncontextmenu = (e) => handler(e, 'toggleManagement');
    }

    // Bind button events
    bindButtonEvents(button) {
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.panelManager.toggleQuickInsertPanel();
        };

        button.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.panelManager.toggleManagementPanel();
        };
    }

    // Create floating panels - No longer needed, changed to create on demand
    createFloatingPanels() {
        // Panels are now created on demand, no longer pre-created here
        // Keep this method for backward compatibility
    }

    // Handle keyboard events
    handleKeyboardEvents(e) {
        // Detect platform, macOS uses Cmd key, others use Ctrl key
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

        // If not initialized, initialize immediately to avoid waiting
        if (!this.initialized && !this.isInitializing) {
            this.fullInitialize();
        }

        // Ensure immediate interaction
        if (!this.panelManager) {
            this.fastInitialize();
        }

        // Cmd/Ctrl+Shift+P: Open Quick Insert Panel (P for Prompt)
        if (ctrlKey && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
            e.preventDefault();
            this.panelManager?.toggleQuickInsertPanel();
        }

        // Cmd/Ctrl+Shift+L: Open Management Panel (L for Library)
        if (ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
            e.preventDefault();
            this.panelManager?.toggleManagementPanel();
        }

        // ESC: Close all panels
        if (e.key === 'Escape') {
            this.panelManager?.closeQuickInsertPanel();
            this.panelManager?.closeManagementPanel();
            this.panelManager?.closePromptModal();
        }

        // Tab key handling
        if (e.key === 'Tab') {
            const activeElement = document.activeElement;

            // Prioritize Tab key trigger for command panel
            if (this.handleCommandPanelTab(e)) {
                return; // Handled, return directly
            }

            // Then handle placeholder navigation
            if (activeElement && activeElement.id === 'chat-input') {
                this.domManipulator.handlePlaceholderNavigation(e, activeElement);
            }
        }
    }

    // Handle Tab key trigger for command panel
    handleCommandPanelTab(e) {
        // Check if there is a selected command button
        const selectedButton = document.querySelector('.selected-command-option-button');

        if (selectedButton) {
            // Prevent default behavior
            e.preventDefault();
            e.stopPropagation();

            // Click selected button
            selectedButton.click();

            logger.debug('Tab key triggered command:', selectedButton.textContent);
            return true;
        }

        return false;
    }

    // Run main loop
    run() {
        // Set keyboard event listener
        document.addEventListener('keydown', (e) => this.handleKeyboardEvents(e));

        // Set MutationObserver
        const observer = new MutationObserver(() => {
            i18n.sync(); // Sync language on DOM changes
            this.domManipulator.setRandomPlaceholder();
            this.domManipulator.hideVersionInfo(); // Added: Hide version info
            this.setupEnhancedPromptManager();
            this.handleVariableModal(); // Added: Handle variable modal
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        i18n.sync(); // Sync language initially
        this.domManipulator.setRandomPlaceholder();
        this.domManipulator.hideVersionInfo(); // Added: Hide version info
        // Trigger initialization early to avoid waiting on first interaction
        this.scheduleFullInitialization();
    }

    // Handle variable modal, remove required attributes
    handleVariableModal() {
        // Find modals that might contain "Insert Variable" title
        // OpenWebUI variable modal is usually an h3 title
        const modals = document.querySelectorAll('.modal-content, .modal-body, .modal-dialog');

        modals.forEach(modal => {
            const titleElement = modal.querySelector('h3, .modal-title, .modal-header');
            if (titleElement && titleElement.textContent.includes('插入变量')) {

                // Find form or container containing input fields
                const formContainer = modal.querySelector('form') || modal;

                // Find all input elements
                const inputs = formContainer.querySelectorAll('input, textarea, select');

                inputs.forEach(input => {
                    if (input.hasAttribute('required')) {
                        input.removeAttribute('required');

                        // Optional: Remove *required text next to label
                        const label = input.closest('.form-group, .form-field')?.querySelector('label');
                        if (label) {
                            // Use safer way to remove *required
                            const requiredSpan = Array.from(label.childNodes).find(node =>
                                node.nodeType === Node.ELEMENT_NODE && node.textContent.includes('*required')
                            );
                            if (requiredSpan) {
                                requiredSpan.remove();
                            } else if (label.innerHTML.includes('*required')) {
                                label.innerHTML = label.innerHTML.replace(/\s*\*required/g, '');
                            }
                        }
                    }
                });
            }
        });
    }
}

// Global function - Backward compatibility
window.insertPrompt = function (prompt) {
    if (window.loaderApp?.promptInserter) {
        window.loaderApp.promptInserter.insertPrompt(prompt).then(success => {
            if (success) {
                window.loaderApp.panelManager?.closeQuickInsertPanel();
            }
        });
    }
};

// Export App Class and Instance
export { LoaderApp };

// Export as PromptApp for backward compatibility
export { LoaderApp as PromptApp };

// Export default for easy importing
export default LoaderApp;
