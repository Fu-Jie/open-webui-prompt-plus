import { i18n } from '../../core/i18n.js';

export class PromptItem {
    /**
     * @param {Object} prompt - The prompt data object
     * @param {string} viewType - 'compact' or 'detailed'
     * @param {Array} categories - List of available categories
     * @param {Object} callbacks - Interaction callbacks
     * @param {Function} callbacks.onInsert - Called when prompt is selected/inserted
     * @param {Function} callbacks.onFavorite - Called when favorite is toggled
     * @param {Function} callbacks.onEdit - Called when edit is triggered
     * @param {Function} callbacks.onDelete - Called when delete is triggered
     * @param {Function} callbacks.onUpdateCategory - Called when category is changed
     */
    constructor(prompt, viewType = 'compact', categories = [], callbacks = {}) {
        this.prompt = prompt;
        this.viewType = viewType;
        this.categories = categories;
        this.callbacks = callbacks;
        this.element = this._render();
    }

    _render() {
        const item = document.createElement('div');

        if (this.viewType === 'compact') {
            this._renderCompact(item);
        } else {
            this._renderDetailed(item);
        }

        return item;
    }

    _renderCompact(item) {
        // REFACTOR: Use gray-700 hover for dark mode consistency
        item.className = 'prompt-item prompt-item--compact p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700' + (this.prompt.isFavorite ? ' favorite' : '');
        item.innerHTML = `
            <div class="prompt-title font-medium text-gray-800 dark:text-gray-100">${this.prompt.title}</div>
            <div class="prompt-preview text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">${this.prompt.content.substring(0, 50)}...</div>
        `;
        item.onclick = (e) => {
            if (this.callbacks.onInsert) this.callbacks.onInsert(this.prompt, e);
        };
    }

    _renderDetailed(item) {
        // REFACTOR: Use gray-800 for dark mode consistency across all panels
        item.className = 'prompt-item prompt-item--detailed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-row items-center justify-between gap-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700';
        item.dataset.promptId = this.prompt.id;

        // Create category dropdown
        const categorySelect = document.createElement('select');
        categorySelect.className = 'text-sm rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
        categorySelect.dataset.action = 'updatePromptCategory';
        categorySelect.dataset.promptId = this.prompt.id;
        categorySelect.title = i18n.t('change_category');

        // Handle change event for category
        categorySelect.onchange = (e) => {
            if (this.callbacks.onUpdateCategory) {
                this.callbacks.onUpdateCategory(this.prompt.id, e.target.value);
            }
        };

        // Add "Uncategorized" option
        const uncategorizedOption = document.createElement('option');
        uncategorizedOption.value = 'null';
        uncategorizedOption.textContent = i18n.t('uncategorized');
        categorySelect.appendChild(uncategorizedOption);

        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });

        // Set current value
        categorySelect.value = this.prompt.category || 'null';

        // New structure for list view - using grid for proper alignment
        item.innerHTML = `
            <div class="flex flex-col items-start cursor-pointer prompt-title-area" style="flex: 1; min-width: 0;" data-action="usePrompt">
                <h4 class="text-base font-semibold text-gray-800 dark:text-gray-100 truncate w-full">${this.prompt.title}</h4>
                <div class="text-xs text-gray-500 dark:text-gray-400 flex gap-3 mt-1">
                    <span>${i18n.t('usage_count')}: ${this.prompt.usageCount}</span>
                    <span>${i18n.t('created_at')}: ${new Date(this.prompt.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="prompt-category-selector-container" style="width: 140px; flex-shrink: 0;"></div>
            <div class="flex gap-2 flex-shrink-0">
                <button data-action="toggleFavorite" data-prompt-id="${this.prompt.id}" class="btn-icon-only btn-header ${this.prompt.isFavorite ? 'favorited' : ''} text-gray-400 hover:text-red-500 transition-colors" title="${i18n.t('favorite')}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="${this.prompt.isFavorite ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                </button>
                <button data-action="editPrompt" data-prompt-id="${this.prompt.id}" class="btn-icon-only btn-header text-gray-400 hover:text-blue-500 transition-colors" title="${i18n.t('edit')}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                </button>
                <button data-action="deletePrompt" data-prompt-id="${this.prompt.id}" class="btn-icon-only btn-header text-gray-400 hover:text-red-500 transition-colors" title="${i18n.t('delete')}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
            </div>
        `;

        // Add click event to title area
        const titleArea = item.querySelector('.prompt-title-area');
        if (titleArea) {
            titleArea.onclick = (e) => {
                e.stopPropagation();
                if (this.callbacks.onInsert) this.callbacks.onInsert(this.prompt, e);
            };
        }

        // Optimize favorite button click experience (Immediate feedback + Stop propagation)
        const favBtn = item.querySelector('button[data-action="toggleFavorite"]');
        if (favBtn) {
            favBtn.onclick = async (e) => {
                e.stopPropagation(); // Stop propagation

                // Immediately toggle visual state (Optimistic update)
                const isFavorited = favBtn.classList.toggle('favorited');

                try {
                    if (this.callbacks.onFavorite) {
                        await this.callbacks.onFavorite(this.prompt.id);
                    }
                } catch (error) {
                    // If failed, rollback state
                    favBtn.classList.toggle('favorited', !isFavorited);
                }
            };
        }

        // Bind other buttons (Edit, Delete) - though they might be handled by global delegation in PanelManager, 
        // it's better to handle them here if we want full encapsulation, 
        // BUT PanelManager relies on data-action for some things. 
        // Let's keep data-action for now but also add direct listeners if callbacks are provided,
        // or rely on the fact that PanelManager might still be catching events.
        // Actually, looking at PanelManager, it seems to use global delegation for some things but direct binding for others.
        // In _createPromptItem, it didn't bind edit/delete directly, so they must be handled by delegation or not shown in that snippet.
        // Wait, looking at the original code:
        // It only bound `onclick` for insert and `favBtn.onclick`.
        // Edit and Delete buttons have `data-action` but no direct onclick in `_createPromptItem`.
        // This implies `PanelManager` (or some other part) listens for these bubbles.
        // However, to be safe and modular, let's bind them if callbacks are present.

        const editBtn = item.querySelector('button[data-action="editPrompt"]');
        if (editBtn && this.callbacks.onEdit) {
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.callbacks.onEdit(this.prompt.id);
            };
        }

        const deleteBtn = item.querySelector('button[data-action="deletePrompt"]');
        if (deleteBtn && this.callbacks.onDelete) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.callbacks.onDelete(this.prompt.id);
            };
        }

        // Append the category select dropdown to its dedicated container
        item.querySelector('.prompt-category-selector-container').appendChild(categorySelect);
    }
}
