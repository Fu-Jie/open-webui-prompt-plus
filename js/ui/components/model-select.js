/**
 * ModelSelect - Searchable Model Select Component
 * Supports input filtering, keyboard navigation
 */
import { i18n } from '../../core/i18n.js';
import { logger } from '../../core/logger.js';

export class ModelSelect {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        this.options = {
            placeholder: i18n.t('search_model_placeholder'),
            onSelect: null,
            ...options
        };

        this.models = [];
        this.filteredModels = [];
        this.selectedModel = null;
        this.isOpen = false;
        this.highlightIndex = -1;

        this.element = null;
        this.input = null;
        this.dropdown = null;

        this.init();
    }

    init() {
        this.element = document.createElement('div');
        this.element.className = 'model-select';
        this.element.innerHTML = `
            <div class="model-select-input-wrapper">
                <input type="text" 
                       class="model-select-input" 
                       placeholder="${this.options.placeholder}"
                       autocomplete="off">
                <span class="model-select-arrow">▼</span>
            </div>
            <div class="model-select-dropdown" style="display: none;"></div>
        `;

        this.input = this.element.querySelector('.model-select-input');
        this.dropdown = this.element.querySelector('.model-select-dropdown');

        this.bindEvents();

        if (this.container) {
            this.container.innerHTML = '';
            this.container.appendChild(this.element);
        }
    }

    bindEvents() {
        // Input filtering
        this.input.addEventListener('input', () => {
            this.filter(this.input.value);
            this.open();
        });

        // Click input to open dropdown
        this.input.addEventListener('focus', () => {
            this.open();
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveHighlight(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveHighlight(-1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.highlightIndex >= 0) {
                        this.selectByIndex(this.highlightIndex);
                    }
                    break;
                case 'Escape':
                    this.close();
                    break;
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.close();
            }
        });

        // Click arrow to toggle
        this.element.querySelector('.model-select-arrow').addEventListener('click', () => {
            this.isOpen ? this.close() : this.open();
        });
    }

    setModels(models) {
        this.models = models || [];
        logger.debug('[ModelSelect] Received model list:', this.models.map(m => m.id));
        this.filteredModels = [...this.models];
        this.renderDropdown();
    }

    setSelected(modelId) {
        logger.debug('[ModelSelect] Attempting to select:', modelId);
        const model = this.models.find(m => m.id === modelId);
        if (model) {
            this.selectedModel = model;
            this.input.value = model.name || model.id;
            logger.debug('[ModelSelect] Selection successful:', model.id);
        } else {
            logger.warn('[ModelSelect] Model not found:', modelId);
            // Even if not found, show ID to avoid blank
            this.input.value = modelId;
            this.selectedModel = { id: modelId, name: modelId };
        }
    }

    filter(query) {
        if (!query) {
            this.filteredModels = [...this.models];
        } else {
            const terms = query.toLowerCase().split(/\s+/).filter(t => t);
            this.filteredModels = this.models.filter(model => {
                const id = (model.id || '').toLowerCase();
                const name = (model.name || '').toLowerCase();
                const ownedBy = (model.owned_by || '').toLowerCase();

                // All search terms must match (Supports "gemini pro" matching "gemini-1.5-pro")
                return terms.every(term =>
                    id.includes(term) ||
                    name.includes(term) ||
                    ownedBy.includes(term)
                );
            });
        }
        this.highlightIndex = this.filteredModels.length > 0 ? 0 : -1;
        this.renderDropdown();
    }

    renderDropdown() {
        if (this.filteredModels.length === 0) {
            this.dropdown.innerHTML = `<div class="model-select-empty">${i18n.t('no_models_found')}</div>`;
            return;
        }

        this.dropdown.innerHTML = this.filteredModels.map((model, index) => `
            <div class="model-select-item ${index === this.highlightIndex ? 'highlighted' : ''}" 
                 data-index="${index}" 
                 data-id="${model.id}">
                <span class="model-name">${model.name || model.id}</span>
                ${model.owned_by ? `<span class="model-provider">${model.owned_by}</span>` : ''}
            </div>
        `).join('');

        // Bind click events
        this.dropdown.querySelectorAll('.model-select-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectByIndex(parseInt(item.dataset.index));
            });
            item.addEventListener('mouseenter', () => {
                this.highlightIndex = parseInt(item.dataset.index);
                this.updateHighlight();
            });
        });
    }

    moveHighlight(direction) {
        if (this.filteredModels.length === 0) return;

        this.highlightIndex += direction;
        if (this.highlightIndex < 0) {
            this.highlightIndex = this.filteredModels.length - 1;
        } else if (this.highlightIndex >= this.filteredModels.length) {
            this.highlightIndex = 0;
        }
        this.updateHighlight();
        this.scrollToHighlight();
    }

    updateHighlight() {
        this.dropdown.querySelectorAll('.model-select-item').forEach((item, i) => {
            item.classList.toggle('highlighted', i === this.highlightIndex);
        });
    }

    scrollToHighlight() {
        const highlighted = this.dropdown.querySelector('.model-select-item.highlighted');
        if (highlighted) {
            highlighted.scrollIntoView({ block: 'nearest' });
        }
    }

    selectByIndex(index) {
        const model = this.filteredModels[index];
        if (model) {
            this.selectedModel = model;
            this.input.value = model.name || model.id;
            this.close();

            if (this.options.onSelect) {
                this.options.onSelect(model);
            }
        }
    }

    getSelected() {
        return this.selectedModel;
    }

    getSelectedId() {
        return this.selectedModel?.id || null;
    }

    open() {
        if (this.models.length === 0) return;

        this.isOpen = true;
        this.dropdown.style.display = 'block';
        this.element.classList.add('open');

        // Reset filter
        if (!this.input.value) {
            this.filteredModels = [...this.models];
            this.highlightIndex = this.selectedModel
                ? this.filteredModels.findIndex(m => m.id === this.selectedModel.id)
                : 0;
            this.renderDropdown();
        }
    }

    close() {
        this.isOpen = false;
        this.dropdown.style.display = 'none';
        this.element.classList.remove('open');
    }

    setLoading(loading) {
        if (loading) {
            this.input.placeholder = i18n.t('loading_models');
            this.input.disabled = true;
        } else {
            this.input.placeholder = this.options.placeholder;
            this.input.disabled = false;
        }
    }

    setError(message) {
        this.input.placeholder = message || i18n.t('load_models_failed');
        this.dropdown.innerHTML = `<div class="model-select-error">${message}</div>`;
    }
}
