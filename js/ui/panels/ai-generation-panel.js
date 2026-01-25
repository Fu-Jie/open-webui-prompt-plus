import { i18n } from '../../core/i18n.js';
import { logger } from '../../core/logger.js';

export class AIGenerationPanel {
    constructor(panelManager) {
        this.panelManager = panelManager;
        this.aiRetryManager = panelManager.aiRetryManager;
        this.state = panelManager.state;
    }

    // AI Generate Prompt - Get input from UI
    async generateWithAI() {
        i18n.sync(); // Sync language before generating help text
        logger.debug('[AIGenerationPanel] generateWithAI called.');
        const description = document.getElementById('ai-description').value.trim();
        const useClipboard = document.getElementById('ai-use-clipboard').checked;
        const categorySelect = document.getElementById('ai-category-select');
        const selectedCategory = categorySelect ? categorySelect.value : '';

        if (!description) {
            alert(i18n.t('describe_func_placeholder'));
            return;
        }

        const userInput = {
            description,
            useClipboard,
            selectedCategory, // Pass selected category
            strictNamingRules: i18n.t('strict_naming_rules').trim(),
            variableSyntaxRules: i18n.t('variable_syntax_rules').trim(),
            availableVariables: this._getVariableHelpMarkdown(),
            availableCategoriesList: this.panelManager.promptManager.categories // Pass dynamic category list
        };

        // Save this input for "Regenerate"
        this.state.lastAIUserInput = { ...userInput };
        logger.debug('[AIGenerationPanel] User input saved for retry:', this.state.lastAIUserInput);

        // Execute generation
        await this._executeAIGeneration(userInput);
    }

    // Internal core logic for executing AI generation
    async _executeAIGeneration(userInput) {
        logger.debug('[AIGenerationPanel] Executing AI generation with input:', userInput);
        // Reset UI state
        this.resetAIPanelState();

        // Show progress and disable button
        this.showAIProgress(true);
        this.updateProgressStep('generating', 'active');

        try {
            logger.debug('[AIGenerationPanel] Calling aiRetryManager.generateWithRetry...');
            const result = await this.aiRetryManager.generateWithRetry(
                userInput,
                (progress) => this.handleAIProgress(progress)
            );
            logger.debug('[AIGenerationPanel] Received result from aiRetryManager:', result);

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
            console.error('[AIGenerationPanel] AI Generation Exception:', error);
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
    }

    // Display AI Result
    displayAIResult(content, validation, hasErrors = false) {
        logger.debug('[AIGenerationPanel] displayAIResult: Starting UI update.', { content, validation });
        // Hide progress
        this.showAIProgress(false);

        // Update progress message with success/status
        const progressMessage = document.getElementById('progress-message');
        if (progressMessage) {
            if (hasErrors) {
                progressMessage.textContent = `⚠️ ${i18n.t('generation_failed_retry')}`;
                progressMessage.style.color = '#d69e2e';
            } else {
                progressMessage.textContent = `✅ ${i18n.t('step_completed')}`;
                progressMessage.style.color = '#38a169';
            }
        }

        // 1. Prefill generated result to manual form for direct save/preview
        // If user selected a category, ensure it's used
        const categorySelect = document.getElementById('ai-category-select');
        if (categorySelect && categorySelect.value) {
            content.category = categorySelect.value;
        }

        logger.debug('[AIGenerationPanel] displayAIResult: Prefilling manual form with content:', content);
        this.panelManager.prefillManualForm(content);

        // 2. Transition to Step 2 (Edit mode) after generation
        setTimeout(() => {
            if (this.panelManager.editorPanel) {
                this.panelManager.editorPanel.goToStep(2);
            }
        }, 300);

        logger.debug('[AIGenerationPanel] displayAIResult: UI update process finished.');
    }

    // Toggle AI Panel Collapse/Expand
    toggleAICollapse(forceCollapse = null) {
        const aiPanel = document.getElementById('ai-assistant-panel');
        if (!aiPanel) return;

        const isCollapsed = forceCollapse !== null ? forceCollapse : !aiPanel.classList.contains('collapsed');

        if (isCollapsed) {
            aiPanel.classList.add('collapsed');
            // Add a "Magic" floating button or update header to allow expanding
            this.updateAIHeaderForCollapsed(true);
        } else {
            aiPanel.classList.remove('collapsed');
            this.updateAIHeaderForCollapsed(false);
        }
    }

    // Update AI Header for collapsed state
    updateAIHeaderForCollapsed(isCollapsed) {
        const header = document.querySelector('#ai-assistant-panel .card-header');
        if (!header) return;

        let toggleBtn = header.querySelector('.btn-toggle-ai');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'btn-toggle-ai';
            toggleBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; color: #667eea; transition: transform 0.3s;';
            header.appendChild(toggleBtn);
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAICollapse();
            });
        }

        toggleBtn.innerHTML = isCollapsed ? '🔼' : '🔽';
        toggleBtn.title = isCollapsed ? i18n.t('expand_ai') : i18n.t('collapse_ai');

        const cardBody = document.querySelector('#ai-assistant-panel .card-body');
        if (cardBody) {
            cardBody.style.display = isCollapsed ? 'none' : 'block';
        }

        const cardBadge = document.querySelector('#ai-assistant-panel .card-badge');
        if (cardBadge) {
            cardBadge.style.display = isCollapsed ? 'none' : 'block';
        }
    }

    // Scroll to manual form
    scrollToManualForm() {
        setTimeout(() => {
            const manualForm = document.getElementById('prompt-edit-form');
            const leftPanel = document.querySelector('.editor-panel-left');

            if (manualForm && leftPanel) {
                manualForm.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                logger.debug('Auto-scrolling to manual edit form');
            }
        }, 200);
    }

    // Reset AI panel state
    resetAIPanelState() {
        this.state.currentAIGeneration = null;

        const aiProgress = document.getElementById('ai-progress');
        if (aiProgress) {
            aiProgress.style.display = 'none';
            const progressMessage = document.getElementById('progress-message');
            if (progressMessage) {
                progressMessage.textContent = i18n.t('ai_processing');
                progressMessage.style.color = '';
            }
        }

        this.setGenerateButtonState(false);
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

    // Show/Hide AI progress and manage button state
    showAIProgress(show) {
        const progressEl = document.getElementById('ai-progress');
        if (progressEl) {
            progressEl.style.display = show ? 'block' : 'none';
        }
        this.setGenerateButtonState(show);
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

    // Generate Variable Help Markdown
    _getVariableHelpMarkdown() {
        const rows = [
            ['text', 'var_text_desc', '`placeholder`, `default`', `\`{{${i18n.t('help_example_name')} | text:placeholder="${i18n.t('help_example_name')}"}}\``],
            ['textarea', 'var_textarea_desc', '`placeholder`, `default`', `\`{{${i18n.t('help_simple_var')} | textarea:placeholder="${i18n.t('help_simple_var')}"}}\``],
            ['select', 'var_select_desc', '`options` (JSON array), `default`', `\`{{${i18n.t('help_typed_var')} | select:options=["${i18n.t('help_example_high')}","${i18n.t('help_example_medium')}","${i18n.t('help_example_low')}"]:default="${i18n.t('help_example_medium')}"}}\``],
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

    // Simple HTML sanitize function
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
}
