import { i18n } from '../../core/i18n.js';
import { logger } from '../../core/logger.js';

export class EditorPanel {
    constructor(panelManager) {
        this.panelManager = panelManager;
        this.promptManager = panelManager.promptManager;
        this.state = panelManager.state;
    }

    // Create the modal element - Two-Step Wizard Layout
    createModal() {
        logger.debug('[EditorPanel] Creating modal with wizard layout. Current lang:', i18n.lang, 'FORCE_UPDATE_CHECK');
        const modal = document.createElement('div');
        modal.id = 'prompt-edit-modal';
        modal.className = 'prompt-modal';
        modal.dataset.lang = i18n.lang;
        modal.style.zIndex = '10002';

        // Stop propagation for key events to prevent global interference (Space bar fix)
        ['keydown', 'keyup', 'keypress'].forEach(type => {
            modal.addEventListener(type, (e) => {
                if (e.key !== 'Escape') {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            });
        });

        modal.innerHTML = `
            <div class="prompt-modal-content unified-panel unified-panel-modal prompt-editor-panel prompt-editor">
                <!-- Top Toolbar with Step Indicators -->
                <header class="editor-topbar gradient-header">
                    <div class="topbar-left" style="display: flex; align-items: center; gap: 12px;">
                        <h2 id="prompt-modal-title" class="editor-title" style="font-size: 1.1rem; font-weight: 600; margin: 0; color: #fff;">${i18n.t('prompt_editor_title')}</h2>
                        <span class="editor-badge" style="padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,0.2); font-size: 11px; font-weight: 500;">${i18n.t('workspace')}</span>
                    </div>
                    
                    <!-- Step Indicators (Center) -->
                    <div class="wizard-steps-container">
                        <div class="wizard-step active" data-step="1">
                            <span class="wizard-step-num">1</span>
                            <span class="wizard-step-label" style="font-size: 13px; font-weight: 500;">${i18n.t('wizard_step_ai')}</span>
                        </div>
                        <div class="wizard-step-line"></div>
                        <div class="wizard-step" data-step="2">
                            <span class="wizard-step-num">2</span>
                            <span class="wizard-step-label" style="font-size: 13px; font-weight: 500;">${i18n.t('wizard_step_edit')}</span>
                        </div>
                    </div>
                    
                    <div class="topbar-right" style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="topbar-btn topbar-btn-close btn-icon-only btn-close" data-action="closePromptModal" title="${i18n.t('close')}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>

                <!-- Main Workspace with Step Content -->
                <main class="editor-workspace" style="display: flex !important; flex-direction: column !important; grid-template-columns: none !important; flex: 1 !important; min-height: 0 !important; overflow: hidden !important;">
                    <!-- Step Content Panel -->
                    <section class="editor-panel-body" style="width: 100% !important; flex: 1 !important;">
                        
                        <!-- Step 1: AI Generation (Full Height) -->
                        <div id="wizard-step-1" class="wizard-step-content active" style="flex: 1; display: flex; flex-direction: column;">
                            <article id="ai-assistant-panel" class="editor-card ai-assistant-card" style="flex: 1; display: flex; flex-direction: column;">
                                    <!-- Compact Header for Step 1 -->
                                    <div class="card-header compact-header" style="padding: 6px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; min-height: 36px;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 14px;">🤖</span>
                                            <h3 class="card-title" style="font-size: 13px; margin: 0;">${i18n.t('ai_generate_title')}</h3>
                                        </div>
                                        <span class="card-badge" style="font-size: 10px; padding: 2px 6px;">${i18n.t('auto_fill')}</span>
                                    </div>
                                
                                <div class="card-body" style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; padding: 12px 16px;">
                                    <div class="ai-form" style="flex: 1; display: flex; flex-direction: column;">
                                        <div class="form-row" style="display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; gap: 12px; margin-bottom: 8px;">
                                            <div class="form-field" style="flex: 1 1 50%; min-width: 0;">
                                                <label for="ai-model-select" class="field-label" style="display: block; margin-bottom: 2px; font-size: 13px; font-weight: 500;">${i18n.t('ai_model')}</label>
                                                <div id="ai-model-select-container" style="width: 100%;">
                                                    <select id="ai-model-select" class="field-select" style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                                        <option value="" disabled selected>${i18n.t('loading_models') || 'Loading models...'}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="form-field" style="flex: 1 1 50%; min-width: 0;">
                                                <label for="ai-category-select" class="field-label" style="display: block; margin-bottom: 2px; font-size: 13px; font-weight: 500;">${i18n.t('category')}</label>
                                                <select id="ai-category-select" class="field-select" style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                                    <option value="" disabled selected>${i18n.t('select_category')}</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                                            <div class="form-field" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                                                <label for="ai-description" class="field-label" style="display: block; margin-bottom: 2px; font-size: 13px; font-weight: 500;">${i18n.t('func_description')}</label>
                                                <textarea id="ai-description" class="field-textarea" style="flex: 1; resize: none; width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" 
                                                    placeholder="${i18n.t('func_desc_placeholder')}"></textarea>
                                                <p class="field-hint" style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">${i18n.t('func_desc_hint')}</p>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row form-row-inline">
                                            <label class="checkbox-field">
                                                <input type="checkbox" id="ai-use-clipboard" class="field-checkbox">
                                                <span class="checkbox-label">${i18n.t('use_clipboard')}</span>
                                            </label>
                                            <p class="field-hint">${i18n.t('use_clipboard_hint')}</p>
                                        </div>

                                        <div class="form-actions" style="display: flex; gap: 8px; justify-content: center; padding: 0; margin-top: 4px;">
                                            <button type="button" class="btn-primary" data-action="generateWithAI" style="min-width: 100px; padding: 4px 12px; height: 32px;">
                                                <span class="btn-text" style="font-weight: 600; font-size: 12px;">${i18n.t('generate_btn')}</span>
                                                <span class="btn-loading" style="display: none;">${i18n.t('generating')}...</span>
                                            </button>
                                            <button type="button" class="btn-secondary" data-action="goToStep2" style="min-width: 80px; padding: 4px 12px; height: 32px; font-size: 12px;">
                                                ${i18n.t('skip_to_edit')} →
                                            </button>
                                        </div>
                                        
                                        <!-- AI Progress Area -->
                                        <div id="ai-progress" class="ai-progress" style="display: none; margin-top: 16px;">
                                            <div class="progress-steps">
                                                <div class="step" id="step-generating">
                                                    <div class="step-icon">1</div>
                                                    <div class="step-label">${i18n.t('step_generating')}</div>
                                                </div>
                                                <div class="step-line"></div>
                                                <div class="step" id="step-validating">
                                                    <div class="step-icon">2</div>
                                                    <div class="step-label">${i18n.t('step_validating')}</div>
                                                </div>
                                                <div class="step-line"></div>
                                                <div class="step" id="step-completed">
                                                    <div class="step-icon">3</div>
                                                    <div class="step-label">${i18n.t('step_completed')}</div>
                                                </div>
                                            </div>
                                            <div id="progress-message" class="progress-message">${i18n.t('ai_processing')}</div>
                                            <div id="progress-details" class="progress-details"></div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </div>

                        <!-- Step 2: Manual Editing (Full Height) -->
                        <div id="wizard-step-2" class="wizard-step-content" style="flex: 1; display: none; flex-direction: column;">
                            <form id="prompt-edit-form" class="editor-card manual-edit-card" style="flex: 1; display: flex; flex-direction: column;">
                                <input type="hidden" id="prompt-edit-id">
                                
                                    <!-- Compact Header for Step 2 -->
                                    <div class="card-header compact-header" style="padding: 6px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; min-height: 36px;">
                                        <h3 class="card-title" style="font-size: 13px; margin: 0;">${i18n.t('manual_edit_title')}</h3>
                                        <button type="button" class="btn-text" data-action="goToStep1" style="color: #667eea; font-size: 12px;">
                                            ← ${i18n.t('back_to_ai')}
                                        </button>
                                    </div>

                                <div class="card-body" style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; padding: 12px 16px;">
                                    <div class="form-row" style="display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; gap: 12px; margin-bottom: 8px;">
                                        <div class="form-field" style="flex: 1 1 50%; min-width: 0;">
                                            <label for="prompt-edit-title" class="field-label" style="display: block; margin-bottom: 2px; font-size: 13px; font-weight: 500;">${i18n.t('title')}</label>
                                            <input type="text" id="prompt-edit-title" class="field-input" required placeholder="${i18n.t('title_placeholder')}" style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                        </div>
                                        <div class="form-field" style="flex: 1 1 50%; min-width: 0;">
                                            <label for="prompt-edit-category" class="field-label" style="display: block; margin-bottom: 2px; font-size: 13px; font-weight: 500;">${i18n.t('category')}</label>
                                            <select id="prompt-edit-category" class="field-select" required style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                                <option value="" disabled selected>${i18n.t('select_category')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="form-row" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                                        <div class="form-field" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                                            <label for="prompt-edit-content" class="field-label" style="display: flex; justify-content: space-between; align-items: center;">
                                                <span style="font-size: 13px; font-weight: 500;">
                                                    ${i18n.t('content')}
                                                </span>
                                                <a href="https://docs.openwebui.com/features/workspace/prompts#prompt-variables" 
                                                   target="_blank" 
                                                   rel="noopener noreferrer" 
                                                   class="btn-text"
                                                   style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                                                    <span>💡</span>
                                                    ${i18n.t('variable_help')}
                                                </a>
                                            </label>
                                            <textarea id="prompt-edit-content" class="field-textarea" style="flex: 1; resize: none;" required placeholder="${i18n.t('content_placeholder')}"></textarea>
                                        </div>
                                    </div>

                                    <div class="form-actions" style="margin-top: 4px; padding-top: 0; display: flex; justify-content: center;">
                                        <button type="submit" class="btn-primary" style="min-width: 100px; padding: 0 16px; font-weight: 600; height: 32px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                                            <span class="btn-icon" style="font-size: 14px;">💾</span>
                                            ${i18n.t('save_prompt')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </section>
                </main>
            </div>
        `;
        this.setupEventListeners(modal);
        return modal;
    }

    setupEventListeners(modal) {
        modal.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;

            const action = actionBtn.dataset.action;
            switch (action) {
                case 'closePromptModal':
                    this.close();
                    break;
                case 'goToStep1':
                    this.goToStep(1);
                    break;
                case 'goToStep2':
                    this.goToStep(2);
                    break;
                case 'generateWithAI':
                    this.generatePrompt();
                    break;
            }
        });

        const form = modal.querySelector('#prompt-edit-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePrompt();
            });
        }
    }

    async generatePrompt() {
        const descriptionInput = document.getElementById('ai-description');
        const modelSelect = document.getElementById('ai-model-select');
        const generateBtn = document.querySelector('[data-action="generateWithAI"]');
        const aiProgress = document.getElementById('ai-progress');
        const progressMessage = document.getElementById('progress-message');

        if (!descriptionInput || !descriptionInput.value.trim()) {
            this.panelManager.domUtils.showAlert(i18n.t('func_desc_hint') || 'Please enter a description');
            return;
        }

        const description = descriptionInput.value.trim();
        const model = modelSelect ? modelSelect.value : null;

        // Helper to update progress steps
        const updateStep = (stepId, status) => {
            const step = document.getElementById(`step-${stepId}`);
            if (!step) return;
            step.classList.remove('active', 'completed', 'error');
            if (status) step.classList.add(status);
        };

        // Set loading state
        if (generateBtn) {
            const btnText = generateBtn.querySelector('.btn-text');
            const btnLoading = generateBtn.querySelector('.btn-loading');
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline';
            generateBtn.disabled = true;
        }

        if (aiProgress) {
            aiProgress.style.display = 'block';
            updateStep('generating', 'active');
            updateStep('validating', '');
            updateStep('completed', '');
            if (progressMessage) progressMessage.textContent = i18n.t('step_generating');
        }

        try {
            // Construct user input object with context
            const userInput = {
                description: description,
                availableCategoriesList: this.promptManager.categories,
                availableVariables: this._getVariableHelpMarkdown()
            };

            const result = await this.promptManager.api.generatePromptContent(userInput, model);

            if (aiProgress) {
                updateStep('generating', 'completed');
                updateStep('validating', 'active');
                if (progressMessage) progressMessage.textContent = i18n.t('step_validating');
            }

            // Simulate a brief validation phase for better UX
            await new Promise(resolve => setTimeout(resolve, 600));

            if (aiProgress) {
                updateStep('validating', 'completed');
                updateStep('completed', 'completed');
                if (progressMessage) progressMessage.textContent = i18n.t('step_completed');
            }

            // Prefill Step 2 form
            this.prefillForm(result);

            // Brief pause to show completion
            await new Promise(resolve => setTimeout(resolve, 400));

            // Go to Step 2
            this.goToStep(2);

        } catch (error) {
            console.error('AI Generation failed:', error);
            if (aiProgress) {
                updateStep('generating', 'error');
                updateStep('validating', 'error');
                if (progressMessage) progressMessage.textContent = i18n.t('generation_failed');
            }
            this.panelManager.domUtils.showAlert(`${i18n.t('generation_failed') || 'Generation failed'}: ${error.message}`);
        } finally {
            // Reset loading state
            if (generateBtn) {
                const btnText = generateBtn.querySelector('.btn-text');
                const btnLoading = generateBtn.querySelector('.btn-loading');
                if (btnText) btnText.style.display = 'inline';
                if (btnLoading) btnLoading.style.display = 'none';
                generateBtn.disabled = false;
            }

            // Hide progress after a delay if successful, or keep if error
            if (aiProgress && !document.querySelector('.step.error')) {
                setTimeout(() => {
                    aiProgress.style.display = 'none';
                }, 2000);
            }
        }
    }

    close() {
        const modal = document.getElementById('prompt-edit-modal');
        if (modal) {
            modal.classList.remove('is-visible');
            modal.style.display = '';
            modal.style.zIndex = '';
        }
        this.state.isModalOpen = false;

        // Restore the panel that was active before opening the editor
        const previousPanel = this.state.activePanel;

        if (previousPanel === 'management') {
            // Restore management panel display
            const managementPanel = document.getElementById('prompt-management-panel');
            if (managementPanel) {
                managementPanel.style.display = '';
            }
            // Refresh management panel to ensure latest data is shown
            if (this.panelManager.managementPanel) {
                this.panelManager.managementPanel.updatePromptList();
                this.panelManager.managementPanel.updateCategoryList();
            }
        } else if (previousPanel === 'quick') {
            // Restore quick insert panel display
            const quickPanel = document.getElementById('quick-insert-panel');
            if (quickPanel) {
                quickPanel.style.display = 'flex';
                quickPanel.style.visibility = 'visible';
            }
            // Refresh quick insert panel
            if (this.panelManager.quickInsertPanel) {
                this.panelManager.quickInsertPanel.updateList();
            }
        } else {
            // No panel was active - just remove overlay and reset state
            // Do NOT call closeAllPanels here to avoid infinite recursion
            this.panelManager.domUtils.removeOverlay();
            this.panelManager.scrollUtils.unlockBackgroundScroll();
        }
    }

    resolveCategory(category) {
        const pm = this.promptManager;
        if (!pm) return category || '';

        const normalized = pm.normalizeCategoryId ? pm.normalizeCategoryId(category) : category;
        if (pm.isValidCategoryId && pm.isValidCategoryId(normalized)) {
            return normalized;
        }

        if (pm.isValidCategoryId && pm.isValidCategoryId('productivity')) {
            return 'productivity';
        }
        if (pm.categories && pm.categories.length > 0) {
            return pm.categories[0].id;
        }

        return normalized || '';
    }

    prefillManualForm(content) {
        if (!content) return;

        const titleInput = document.getElementById('prompt-edit-title');
        const contentTextarea = document.getElementById('prompt-edit-content');
        const categorySelect = document.getElementById('prompt-edit-category');

        const resolvedCategory = this.resolveCategory(content.category);

        if (titleInput) titleInput.value = content.title || '';
        if (contentTextarea) contentTextarea.value = content.content || '';
        if (categorySelect) categorySelect.value = resolvedCategory;
    }

    async savePrompt() {
        if (!this.promptManager) return;

        const id = document.getElementById('prompt-edit-id').value;
        const title = document.getElementById('prompt-edit-title').value.trim();
        const content = document.getElementById('prompt-edit-content').value.trim();
        let category = document.getElementById('prompt-edit-category').value;

        if (!title || !content) {
            this.panelManager.domUtils.showAlert(i18n.t('title_content_required'));
            return;
        }

        if (!category) {
            category = this.resolveCategory(category);
            const categorySelect = document.getElementById('prompt-edit-category');
            if (categorySelect) {
                categorySelect.value = category;
            }
        }

        if (!category) {
            this.panelManager.domUtils.showAlert(i18n.t('category_required'));
            return;
        }

        try {
            const promptData = {
                title: title,
                content: content,
                category: category,
                access_control: null,
            };

            let savedPrompt;
            if (id) {
                savedPrompt = await this.promptManager.updatePrompt(id, promptData);
                this.panelManager.domUtils.showAlert(i18n.t('prompt_updated'));
            } else {
                savedPrompt = await this.promptManager.createPrompt(promptData);
                this.panelManager.domUtils.showAlert(i18n.t('prompt_created'));

                // Update the ID field so subsequent saves are updates
                if (savedPrompt && savedPrompt.id) {
                    document.getElementById('prompt-edit-id').value = savedPrompt.id;
                }
            }

            // Rebuild search index
            if (this.panelManager.rebuildSearchIndex) {
                this.panelManager.rebuildSearchIndex();
            }

            // Update lists
            if (this.panelManager.managementPanel) {
                this.panelManager.managementPanel.updatePromptList();
                this.panelManager.managementPanel.updateCategoryList();
            }

            // this.close(); // Keep panel open as requested
        } catch (error) {
            console.error('Save prompt failed:', error);
            this.panelManager.domUtils.showAlert(`${i18n.t('save_failed')}${error.message}`);
        }
    }

    // Open prompt edit modal - initialize to correct step
    openPromptModal(prompt = null) {
        i18n.sync();
        this.promptManager.refreshCategories();

        let modal = document.getElementById('prompt-edit-modal');

        // Lazy initialization: Create modal if it doesn't exist
        if (!modal) {
            logger.debug('[EditorPanel] Creating prompt edit modal...');
            modal = this.createModal();
            document.body.appendChild(modal);
        } else if (modal.dataset.lang !== i18n.lang) {
            logger.debug(`[EditorPanel] Language mismatch (Modal: ${modal.dataset.lang}, Current: ${i18n.lang}), recreating prompt modal...`);
            const newModal = this.createModal();
            if (modal.parentNode) {
                modal.parentNode.replaceChild(newModal, modal);
            } else {
                document.body.appendChild(newModal);
            }
            modal = newModal;
        }

        const title = document.getElementById('prompt-modal-title');
        const form = document.getElementById('prompt-edit-form');

        if (!modal || !title || !form) {
            console.error('[EditorPanel] Failed to initialize modal elements');
            return;
        }

        const categorySelect = document.getElementById('prompt-edit-category');
        const aiCategorySelect = document.getElementById('ai-category-select');

        if (categorySelect) {
            categorySelect.innerHTML = '';

            if (aiCategorySelect) {
                while (aiCategorySelect.options.length > 1) {
                    aiCategorySelect.remove(1);
                }
            }

            this.promptManager.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categorySelect.appendChild(option);

                if (aiCategorySelect) {
                    const aiOption = document.createElement('option');
                    aiOption.value = cat.id;
                    aiOption.textContent = cat.name;
                    aiCategorySelect.appendChild(aiOption);
                }
            });
        }

        // Add custom validation messages to override browser default language
        const requiredElements = form.querySelectorAll('[required]');
        requiredElements.forEach(el => {
            el.oninvalid = (e) => {
                e.target.setCustomValidity(i18n.t('field_required') || 'This field is required');
            };
            el.oninput = (e) => {
                e.target.setCustomValidity('');
            };
        });

        this.state.currentAIGeneration = null;
        const validationResult = document.getElementById('validation-result');
        const aiProgress = document.getElementById('ai-progress');
        if (validationResult) validationResult.style.display = 'none';
        if (aiProgress) aiProgress.style.display = 'none';

        if (prompt) {
            title.textContent = i18n.t('edit_prompt_title');
            document.getElementById('prompt-edit-id').value = prompt.id;
            document.getElementById('prompt-edit-title').value = prompt.title;
            document.getElementById('prompt-edit-content').value = prompt.content;
            document.getElementById('prompt-edit-category').value = prompt.category;

            this.goToStep(2);
        } else {
            title.textContent = i18n.t('new_prompt_title');
            form.reset();
            document.getElementById('prompt-edit-id').value = '';

            this.goToStep(1);
        }

        const managementPanel = document.getElementById('prompt-management-panel');
        if (managementPanel) {
            managementPanel.style.display = 'none';
        }

        modal.style.display = 'flex';
        modal.style.zIndex = '99999';

        const modalContent = modal.querySelector('.prompt-editor-panel');
        // Inline styles removed to rely on CSS classes (unified-panel-modal)
        // This fixes the white background issue in dark mode
        if (modalContent) {
            // Ensure no conflicting inline styles
            modalContent.style.cssText = '';
        }

        modal.classList.add('is-visible');
        this.state.isModalOpen = true;

        // Ensure AI model select is populated
        if (this.panelManager && typeof this.panelManager.loadAvailableModels === 'function') {
            this.panelManager.loadAvailableModels();
        }
    }

    // Navigate to specific step
    goToStep(stepNumber) {
        const step1Content = document.getElementById('wizard-step-1');
        const step2Content = document.getElementById('wizard-step-2');
        const step1Indicator = document.querySelector('.wizard-step[data-step="1"]');
        const step2Indicator = document.querySelector('.wizard-step[data-step="2"]');

        if (!step1Content || !step2Content) {
            console.warn('[EditorPanel] Step content elements not found');
            return;
        }

        if (stepNumber === 1) {
            // Show Step 1, hide Step 2
            step1Content.style.display = 'flex';
            step2Content.style.display = 'none';

            // Update indicators
            if (step1Indicator) {
                step1Indicator.classList.add('active');
                step1Indicator.style.background = 'rgba(255,255,255,0.25)';
                step1Indicator.style.opacity = '1';
                step1Indicator.querySelector('.wizard-step-num').style.background = '#fff';
                step1Indicator.querySelector('.wizard-step-num').style.color = '#667eea';
            }
            if (step2Indicator) {
                step2Indicator.classList.remove('active');
                step2Indicator.style.background = 'transparent';
                step2Indicator.style.opacity = '0.7';
                step2Indicator.querySelector('.wizard-step-num').style.background = 'rgba(255,255,255,0.3)';
                step2Indicator.querySelector('.wizard-step-num').style.color = '#fff';
            }
        } else if (stepNumber === 2) {
            // Show Step 2, hide Step 1
            step1Content.style.display = 'none';
            step2Content.style.display = 'flex';

            // Update indicators
            if (step1Indicator) {
                step1Indicator.classList.remove('active');
                step1Indicator.style.background = 'transparent';
                step1Indicator.style.opacity = '0.7';
                step1Indicator.querySelector('.wizard-step-num').style.background = 'rgba(255,255,255,0.3)';
                step1Indicator.querySelector('.wizard-step-num').style.color = '#fff';
            }
            if (step2Indicator) {
                step2Indicator.classList.add('active');
                step2Indicator.style.background = 'rgba(255,255,255,0.25)';
                step2Indicator.style.opacity = '1';
                step2Indicator.querySelector('.wizard-step-num').style.background = '#fff';
                step2Indicator.querySelector('.wizard-step-num').style.color = '#667eea';
            }
        }

        logger.debug(`[EditorPanel] Navigated to Step ${stepNumber}`);
    }

    _getVariableHelpMarkdown() {
        const rows = [
            ['text', 'var_text_desc', '`placeholder`, `default`', '`{{summary | text:placeholder="Enter summary"}}`'],
            ['textarea', 'var_textarea_desc', '`placeholder`, `default`', '`{{article | textarea:placeholder="Enter article content"}}`'],
            ['select', 'var_select_desc', '`options` (JSON array), `default`', '`{{status | select:options=["Done","In Progress"]:default="In Progress"}}`'],
            ['number', 'var_number_desc', '`placeholder`, `default`', '`{{quantity | number:default=1}}`'],
            ['checkbox', 'var_checkbox_desc', '`default` (Boolean)', '`{{include_summary | checkbox:default=true}}`'],
            ['date', 'var_date_desc', '`default`', '`{{start_date | date:default="2024-01-01"}}`'],
            ['datetime-local', 'var_datetime_local_desc', '`default`', '`{{meeting_time | datetime-local}}`'],
            ['color', 'var_color_desc', '`default` (Hex)', '`{{brand_color | color:default="#FF5733"}}`'],
            ['email', 'var_email_desc', '`placeholder`, `default`', '`{{recipient | email:placeholder="Enter email"}}`'],
            ['month', 'var_month_desc', '`default`', '`{{report_month | month:default="2024-08"}}`'],
            ['range', 'var_range_desc', '`min`, `max`, `step`, `default`', '`{{satisfaction | range:min=0:max=100:step=1:default=75}}`'],
            ['tel', 'var_tel_desc', '`placeholder`, `default`', '`{{contact_number | tel}}`'],
            ['time', 'var_time_desc', '`default`', '`{{start_time | time:default="09:00"}}`'],
            ['url', 'var_url_desc', '`placeholder`, `default`', '`{{source_url | url:placeholder="https://example.com"}}`']
        ];

        const tableHeader = `| ${i18n.t('var_table_type')} | ${i18n.t('var_table_desc')} | ${i18n.t('var_table_props')} | ${i18n.t('var_table_example')} |`;
        const tableDivider = `| ---------------- | ------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------- |`;

        const tableRows = rows.map(row => {
            const [type, descKey, props, example] = row;
            return `| **${type}** | ${i18n.t(descKey)} | ${props} | ${example} |`;
        }).join('\n');

        return `
${i18n.t('available_variables_intro')}

${tableHeader}
${tableDivider}
${tableRows}
        `.trim();
    }
    // Prefill the form with data (e.g., from AI generation)
    prefillForm(data) {
        if (!data) return;

        logger.debug('[EditorPanel] Prefilling form with data:', data);

        const titleInput = document.getElementById('prompt-edit-title');
        const contentInput = document.getElementById('prompt-edit-content');
        const categorySelect = document.getElementById('prompt-edit-category');
        const idInput = document.getElementById('prompt-edit-id');

        if (titleInput) titleInput.value = data.title || '';
        if (contentInput) contentInput.value = data.content || '';
        if (idInput) idInput.value = data.id || '';

        if (categorySelect && data.category) {
            // Check if category exists, if not, select first available or empty
            const optionExists = Array.from(categorySelect.options).some(opt => opt.value === data.category);
            if (optionExists) {
                categorySelect.value = data.category;
            } else {
                console.warn(`[EditorPanel] Category ${data.category} not found in select options.`);
                // Optionally select 'uncategorized' or leave as is
            }
        }

        // Switch to Step 2 (Manual Edit)
        this.goToStep(2);
    }
}

