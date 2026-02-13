import { i18n } from '../../core/i18n.js';

export class CategoryFilter {
    /**
     * @param {Object} config
     * @param {Array} config.categories - List of category objects
     * @param {Array} config.prompts - List of all prompts (for counting)
     * @param {string} config.activeCategoryId - Currently active category ID
     * @param {string} config.displayMode - 'tabs' or 'list'
     * @param {Object} config.callbacks
     * @param {Function} config.callbacks.onFilter - (categoryId) => void
     * @param {Function} config.callbacks.onAdd - () => void
     * @param {Function} config.callbacks.onEdit - (categoryId) => void
     * @param {Function} config.callbacks.onDelete - (categoryId) => void
     */
    constructor(config) {
        this.config = config;
        this.element = document.createElement('div');
        this._initContainer();
        this.update();
    }

    _initContainer() {
        if (this.config.displayMode === 'tabs') {
            // REFACTOR: Consolidate styling into Tailwind classes.
            this.element.className = 'flex flex-wrap gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0';
            this.element.id = 'quick-panel-categories';
        } else { // 'list' view
            this.element.className = 'flex flex-col gap-1 p-0 border-none';
            this.element.id = 'category-list';
        }
    }

    update(newConfig = {}) {
        this.config = { ...this.config, ...newConfig };
        this.element.innerHTML = '';

        if (this.config.displayMode === 'tabs') {
            this._renderTabs();
        } else {
            this._renderList();
        }
    }

    _getCategoryIcon(id, category = null) {
        // 1. If category object has an icon, use it (Custom icons)
        if (category && category.icon) return category.icon;

        // 2. Fallback to hardcoded mapping for system categories
        const icons = {
            'writing': '✍️',
            'productivity': '🚀',
            'learning': '🎓',
            'coding': '💻',
            'data': '📊',
            'lifestyle': '🏠',
            'roleplay': '🎭',
            'all': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 inline-block mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>',
            'favorites': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 inline-block mr-1 text-red-500"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>',
            'uncategorized': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 inline-block mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" /></svg>'
        };
        return icons[id] || '📁';
    }

    _renderTabs() {
        const activeId = this.config.activeCategoryId || 'all';

        // Add "All" tab
        this.element.appendChild(this._createTab('all', `${this._getCategoryIcon('all')}${i18n.t('all_categories')}`, activeId === 'all'));

        // Add "Favorites" tab
        this.element.appendChild(this._createTab('favorites', `${this._getCategoryIcon('favorites')}${i18n.t('favorite')}`, activeId === 'favorites'));

        // Add Category tabs
        this.config.categories.forEach(category => {
            const count = this.config.prompts.filter(p => p.category === category.id).length;
            if (count > 0) {
                const displayName = category.name;
                const displayIcon = this._getCategoryIcon(category.id, category);

                this.element.appendChild(this._createTab(category.id, `${displayIcon} ${displayName}`, activeId === category.id));
            }
        });

        // Add "Uncategorized" tab (Moved to end)
        const uncategorizedCount = this.config.prompts.filter(p => !p.category || p.category === 'null').length;
        if (uncategorizedCount > 0) {
            this.element.appendChild(this._createTab('uncategorized', `${this._getCategoryIcon('uncategorized')}${i18n.t('uncategorized')}`, activeId === 'uncategorized'));
        }
    }

    _createTab(id, text, isActive) {
        const tab = document.createElement('button');
        // REFACTOR: Consolidate active/inactive states and remove .category-tab dependency
        const baseClasses = 'category-tab px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center';
        const activeClasses = 'active bg-blue-500 text-white';
        const inactiveClasses = 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700';
        tab.className = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
        tab.dataset.categoryId = id;
        tab.innerHTML = `${text}`;

        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.config.callbacks.onFilter) {
                this.config.callbacks.onFilter(id);
            }
        });

        return tab;
    }

    _renderList() {
        const activeId = this.config.activeCategoryId || 'all';

        // Helper to create common classes
        const getItemClass = (id) => {
            const isActive = id === activeId;
            // Added 'group' for hover effects
            const base = 'category-item group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[36px]';
            const active = 'active bg-gray-100 dark:bg-gray-800 font-medium';
            return isActive ? `${base} ${active}` : base;
        };

        // Helper to render a unified item
        const renderItem = (id, name, icon, count, isSpecial = false) => {
            const item = document.createElement('div');
            item.className = getItemClass(id);
            item.dataset.action = 'filterByCategory';
            item.dataset.categoryId = id;

            // Left side: Icon + Name
            const leftContent = `
                <div class="flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
                    <span class="category-icon flex-shrink-0 text-gray-500 dark:text-gray-400 ${id === 'favorites' ? 'text-red-500' : ''}">
                        ${icon}
                    </span>
                    <span class="category-name truncate text-sm">${name}</span>
                </div>
            `;

            // Right side: Count (and Actions for non-special)
            let rightContent = '';

            if (isSpecial) {
                // Special items only show count
                rightContent = `
                    <span class="text-xs text-gray-400 font-mono ml-2">${count}</span>
                `;
            } else {
                // Regular items: Show count by default, swap to actions on hover
                // group-hover:hidden on count, hidden group-hover:flex on actions
                rightContent = `
                    <div class="flex items-center justify-end ml-2 min-w-[48px]">
                        <!-- Count: Visible by default, hidden on hover -->
                        <span class="category-count text-xs text-gray-400 font-mono group-hover:hidden">${count}</span>
                        
                        <!-- Actions: Hidden by default, visible on hover -->
                        <div class="category-actions hidden group-hover:flex items-center gap-1">
                            <button class="action-btn-edit w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors" title="${i18n.t('edit')}">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                            </button>
                            <button class="action-btn-delete w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="${i18n.t('delete')}">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            </button>
                        </div>
                    </div>
                `;
            }

            item.innerHTML = leftContent + rightContent;

            // Bind events
            item.onclick = () => this.config.callbacks.onFilter && this.config.callbacks.onFilter(id);

            if (!isSpecial) {
                const editBtn = item.querySelector('.action-btn-edit');
                const deleteBtn = item.querySelector('.action-btn-delete');

                if (editBtn) {
                    editBtn.onclick = (e) => {
                        e.stopPropagation();
                        this._editingCategoryId = id;
                        this.update();
                    };
                }
                if (deleteBtn) {
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (this.config.callbacks.onDelete) this.config.callbacks.onDelete(id);
                    };
                }
            }

            return item;
        };

        // 1. All Prompts
        const allCount = this.config.prompts.length;
        this.element.appendChild(renderItem(
            'all',
            i18n.t('all_categories'),
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>',
            allCount,
            true
        ));

        // 2. Favorites
        const favoritesCount = this.config.prompts.filter(p => p.isFavorite).length;
        this.element.appendChild(renderItem(
            'favorites',
            i18n.t('favorite'),
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>',
            favoritesCount,
            true
        ));

        // 3. Uncategorized
        const uncategorizedCount = this.config.prompts.filter(p => !p.category || p.category === 'null').length;
        this.element.appendChild(renderItem(
            'uncategorized',
            i18n.t('uncategorized'),
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" /></svg>',
            uncategorizedCount,
            true
        ));

        // 4. Regular Categories
        this.config.categories.forEach(category => {
            // Check if this category is being edited
            if (this._editingCategoryId === category.id) {
                // Render Edit Mode
                const item = document.createElement('div');
                item.className = 'category-item flex items-center gap-2 px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-blue-500 shadow-sm';

                const input = document.createElement('input');
                input.type = 'text';
                input.value = category.name;
                input.className = 'flex-1 min-w-0 px-2 py-1 text-sm bg-transparent border-none focus:ring-0 p-0';

                // Save logic
                const save = () => {
                    const newName = input.value.trim();
                    if (newName && newName !== category.name) {
                        if (this.config.callbacks.onUpdate) {
                            this.config.callbacks.onUpdate(category.id, newName);
                        }
                    }
                    this._editingCategoryId = null;
                    this.update();
                };

                input.onkeydown = (e) => {
                    if (e.key === 'Enter') save();
                    else if (e.key === 'Escape') {
                        this._editingCategoryId = null;
                        this.update();
                    }
                    e.stopPropagation();
                };
                input.onblur = () => setTimeout(save, 100);

                item.appendChild(input);
                this.element.appendChild(item);
                setTimeout(() => input.focus(), 0);
            } else {
                // Render View Mode (using unified helper)
                const count = this.config.prompts.filter(p => p.category === category.id).length;
                const icon = this._getCategoryIcon(category.id, category);

                this.element.appendChild(renderItem(
                    category.id,
                    category.name,
                    icon,
                    count,
                    false // isSpecial = false, enables hover actions
                ));
            }
        });
    }
}
