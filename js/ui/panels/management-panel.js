import { i18n } from '../../core/i18n.js';
import { logger } from '../../core/logger.js';
import { Header } from '../components/header.js';
import { SearchBar } from '../components/search-bar.js';
import { CategoryFilter } from '../components/category-filter.js';
import { Pagination } from '../components/pagination.js';
import { KeyboardNavigation } from '../utils/keyboard-nav.js';
import { PromptItem } from '../components/prompt-item.js';
import { HighlightUtils } from '../utils/highlight-utils.js';
import { CategoryModal } from '../modals/category-modal.js';
import { generateUUID } from '../../utils/helpers.js';


export class ManagementPanel {
    constructor(manager) {
        this.manager = manager;
    }

    get state() {
        return this.manager.state;
    }

    get promptManager() {
        return this.manager.promptManager;
    }

    get domUtils() {
        return this.manager.domUtils;
    }

    get scrollUtils() {
        return this.manager.scrollUtils;
    }

    create(container) {
        if (document.getElementById('prompt-management-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'prompt-management-panel';
        panel.className = 'unified-panel unified-panel-modal unified-panel--management';
        panel.style.display = 'none';

        // 1. Header Container (Fixed)
        const headerContainer = document.createElement('div');
        headerContainer.className = 'panel-header-container flex-shrink-0'; // Disable shrinking

        const header = new Header(i18n.t('prompt_management'), [{
            title: i18n.t('new_prompt'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>',
            text: i18n.t('create'),
            action: 'createNewPrompt',
            className: 'btn-secondary'
        }, {
            title: i18n.t('import'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0l-4.5-4.5M12 16.5l4.5-4.5" /></svg>',
            text: i18n.t('import'),
            action: 'importPrompts',
            className: 'btn-secondary'
        }, {
            title: i18n.t('export'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>',
            text: i18n.t('export'),
            action: 'exportPrompts',
            className: 'btn-secondary'

        }, {
            title: i18n.t('close'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>',
            action: 'closeManagementPanel',
            className: 'btn-icon-only btn-close'
        }]).element;

        headerContainer.append(header);

        // 2. Main Content Area (Flexible)
        // Contains sidebar and main list, occupying all remaining space
        const panelContent = document.createElement('div');
        panelContent.className = 'panel-content flex flex-1 overflow-hidden min-h-0';
        panelContent.style.cssText = 'display: flex; flex-direction: row;';

        // 2.1 Sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'panel-sidebar';
        // Adaptive width for sidebar
        sidebar.style.minWidth = '240px';
        sidebar.style.maxWidth = '320px';
        sidebar.style.width = 'auto';
        sidebar.style.flex = '0 0 auto';

        const categorySection = document.createElement('div');
        categorySection.className = 'sidebar-section';
        categorySection.innerHTML = `<h3>${i18n.t('category')}</h3>`;
        this.categoryFilter = new CategoryFilter({
            categories: this.promptManager.categories,
            prompts: this.promptManager.prompts,
            activeCategoryId: 'all', // Default
            displayMode: 'list',
            callbacks: {
                onFilter: (id) => {
                    this.filterByCategory(id);
                },
                onUpdate: (id, newName) => {
                    this.promptManager.updateCategory(id, newName).then(() => {
                        this.updateCategoryList();
                        this.filterByCategory(this.state.currentManagementCategoryId);
                    });
                },
                onDelete: (id) => this.deleteCategory(id)
            }
        });
        const categoryList = this.categoryFilter.element;
        const addCategoryBtn = document.createElement('button');
        addCategoryBtn.className = 'btn-add-category btn-secondary inline-flex items-center gap-1 rounded-md px-3 py-1.5 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800';
        addCategoryBtn.dataset.action = 'addNewCategory';
        addCategoryBtn.textContent = i18n.t('add_category');
        categorySection.append(categoryList, addCategoryBtn);
        sidebar.append(categorySection);

        // 2.2 Main List Area
        const main = document.createElement('div');
        main.className = 'panel-main flex-1 flex flex-col overflow-hidden min-w-0';

        // Toolbar (Search)
        const toolbar = new SearchBar({
            containerClass: 'main-toolbar flex-shrink-0',
            inputClass: 'main-search',
            placeholder: i18n.t('search_prompts_placeholder'),
            oninput: (e) => this.filterPrompts(e.target.value)
        }).element;

        // List Container (Scrollable)
        const listContainer = document.createElement('div');
        listContainer.className = 'flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0';
        listContainer.id = 'prompt-list-container';
        // Optimize scroll experience
        listContainer.style.overscrollBehavior = 'contain';
        listContainer.style.paddingBottom = '32px'; // Bottom padding

        main.append(toolbar, listContainer);
        panelContent.append(sidebar, main);

        // 3. Footer (Fixed)
        // Strictly fixed at bottom, not changing with content
        const footer = document.createElement('div');
        footer.id = 'management-panel-footer';
        // Use style class completely consistent with Quick Insert
        footer.className = 'flex-shrink-0 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center';
        footer.style.cssText = 'height: 48px; min-height: 48px; display: flex; align-items: center; justify-content: center; background: inherit; margin-top: auto;';

        if (!this.pagination) {
            this.pagination = new Pagination(footer, {
                onPageChange: (direction) => this.changePage(direction === 'prev' ? 'prev' : 'next')
            });
        }

        // Assemble Panel
        panel.append(headerContainer, panelContent, footer);
        container.appendChild(panel);

        // Modal Container Setup
        let modalContainer = document.querySelector('div[data-pes-modal-container="true"]');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'prompt-enhancement-system';
            modalContainer.setAttribute('data-pes-modal-container', 'true');
            modalContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
            document.body.appendChild(modalContainer);
        }

        const promptModal = this.manager.editorPanel.createModal();
        const categoryModal = this._createCategoryModal();
        modalContainer.appendChild(promptModal);
        modalContainer.appendChild(categoryModal);

        promptModal.style.pointerEvents = 'auto';
        categoryModal.style.pointerEvents = 'auto';

        // Stop propagation for modals
        const stopModalPropagation = (e) => {
            if (e.key !== 'Escape') {
                e.stopPropagation();
            }
        };
        ['keydown', 'keyup', 'keypress'].forEach(type => {
            promptModal.addEventListener(type, stopModalPropagation);
            categoryModal.addEventListener(type, stopModalPropagation);
        });

        // Setup Actions & Events
        // this.scrollUtils.attachPanelWheelRouting(panel, listContainer);
        this.setupActions(panel);
        this.setupActions(promptModal);
        this.setupActions(categoryModal);
        this.manager.setupOpacitySlider(panel);
        this.updateCategoryList();
        this.updatePromptList();
        this.setupKeyboard(panel);

        // document.getElementById('prompt-edit-form').onsubmit = (e) => {
        //     e.preventDefault();
        //     this.manager.savePrompt();
        // };

        this.manager.loadAvailableModels();
        this.manager.updateAITargetCategories();

        // Handle resize to recalculate page size
        window.addEventListener('resize', () => {
            if (panel.style.display !== 'none') {
                clearTimeout(this._resizeTimer);
                this._resizeTimer = setTimeout(() => {
                    this._calculatePageSize();
                    this.updatePromptList();
                }, 100);
            }
        });
    }

    toggle() {
        i18n.sync(); // Sync language first
        this.promptManager.refreshCategories(); // Refresh categories with new language

        // Check if language changed, if so destroy existing panel to force re-render
        if (this.state.lastRenderedLang && this.state.lastRenderedLang !== i18n.lang) {
            const existingPanel = document.getElementById('quick-insert-panel');
            if (existingPanel) {
                existingPanel.remove();
                this.state.quickPanelCreated = false;
            }
            const existingMgmtPanel = document.getElementById('prompt-management-panel');
            if (existingMgmtPanel) {
                existingMgmtPanel.remove();
                this.state.managementPanelCreated = false;
            }
            const modalContainer = document.getElementById('prompt-enhancement-system');
            if (modalContainer) {
                modalContainer.remove();
            }
        }
        this.state.lastRenderedLang = i18n.lang;

        let managementPanel = document.getElementById('prompt-management-panel');

        if (this.state.activePanel === 'management') {
            this.close();
            return;
        } else if (this.state.activePanel) {
            this.manager.closeAllPanels();
        }

        if (!managementPanel) {
            this.manager.rootContainer = this.domUtils.ensureRootContainer();
            this.create(this.manager.rootContainer);
            managementPanel = document.getElementById('prompt-management-panel');
            this.state.managementPanelCreated = true;
        }

        if (managementPanel) {
            this.domUtils.createOverlay('management');
            managementPanel.style.position = 'fixed';
            managementPanel.style.display = 'flex';
            managementPanel.style.flexDirection = 'column'; // Ensure vertical layout
            managementPanel.style.zIndex = '100001';
            managementPanel.style.opacity = '1';
            managementPanel.style.visibility = 'visible';
            // Lock background scroll to prevent panel from being "pushed out" of visible range
            this.scrollUtils.lockBackgroundScroll();
            this.state.activePanel = 'management';
            // Center the management panel immediately upon opening
            this.adjustPosition(managementPanel);

            if (typeof managementPanel.tabIndex !== 'number' || managementPanel.tabIndex < 0) {
                managementPanel.tabIndex = 0;
            }
            try {
                managementPanel.focus({ preventScroll: true });
            } catch (err) {
                managementPanel.focus();
            }

            this.updateCategoryList();
            // First render with default page size to populate DOM
            this.updatePromptList();

            // Defer page size calculation until after DOM is fully rendered
            requestAnimationFrame(() => {
                this._calculatePageSize();
                // Re-render with accurate page size
                this.updatePromptList();
            });
        }
    }

    close() {

        const panel = document.getElementById('prompt-management-panel');
        if (panel) {
            panel.style.display = 'none';
            this.state.activePanel = null;
            this.domUtils.removeOverlay();
            // Restore background scrolling
            this.scrollUtils.unlockBackgroundScroll();
        }
    }

    navigateTo() {
        this.manager.closeQuickInsertPanel();
        this.toggle();
    }

    cycleCategory(direction = 'next') {
        const items = Array.from(document.querySelectorAll('#prompt-management-panel .category-item'));
        if (!items.length) return;
        const activeIdx = items.findIndex(t => t.classList.contains('active'));
        const idx = activeIdx < 0 ? 0 :
            (direction === 'prev'
                ? (activeIdx - 1 + items.length) % items.length
                : (activeIdx + 1) % items.length);
        items[idx].click();
    }

    setupActions(panel) {
        if (panel.dataset.actionsBound === 'true') {
            return;
        }

        const handleAction = (e) => {
            // Strong interception: Help button/link handled directly in delegation layer, avoiding triggering any close logic
            const helpBtnEl = e.target.closest && (e.target.closest('#pes-show-help-btn') || e.target.closest('.hint-inline [data-action="toggleShortcutHelp"]'));
            if (helpBtnEl) {
                e.preventDefault();
                e.stopPropagation();
                this.manager._suppressGlobalCloseOnce = true;
                this.manager.toggleShortcutHelp();
                return;
            }

            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;

            const action = actionTarget.dataset.action;

            // Stop the event from bubbling up to the document, which might close the panel
            // via the global click handler or be intercepted by the host app.
            e.stopPropagation();

            const card = actionTarget.closest('.prompt-item--detailed');
            const promptId = actionTarget.dataset.promptId || card?.dataset.promptId;
            const categoryId = actionTarget.dataset.categoryId;

            switch (action) {
                case 'prevPage':
                case 'nextPage':
                    // These seem to be for quick panel, but just in case
                    if (this.manager.quickInsertPanel) {
                        this.manager.quickInsertPanel.changePage(action.replace('Page', '').toLowerCase());
                    }
                    break;
                case 'managementPrevPage':
                case 'managementNextPage':
                    this.changePage(action.includes('Prev') ? 'prev' : 'next');
                    break;
                case 'updatePromptCategory':
                    const selectElement = e.target;
                    const newCategoryId = selectElement.value === 'null' ? null : selectElement.value;
                    if (promptId) {
                        this.updatePromptCategory(promptId, newCategoryId);
                    }
                    break;
                case 'createNewPromptViaQuickPanel':
                    this.navigateTo();
                    this.manager.createNewPrompt();
                    break;
                case 'navigateToManagementPanel':
                    this.navigateTo();
                    break;
                case 'closeQuickInsertPanel':
                    this.manager.closeQuickInsertPanel();
                    break;
                case 'editPrompt':
                    if (promptId) this.manager.editPrompt(promptId);
                    break;
                case 'deletePrompt':
                    if (promptId) this.deletePrompt(promptId);
                    break;
                case 'toggleFavorite':
                    if (promptId) this.manager.toggleFavorite(promptId);
                    break;
                case 'filterByCategory':
                    if (categoryId) this.filterByCategory(categoryId);
                    break;
                case 'addNewCategory':
                    this.addNewCategory();
                    break;
                case 'editCategory':
                    if (categoryId) this.editCategory(categoryId);
                    break;
                case 'deleteCategory':
                    if (categoryId) this.deleteCategory(categoryId);
                    break;
                case 'closeCategoryModal':
                    this.closeCategoryModal();
                    break;
                case 'exportData':
                    this.manager.promptManager.exportData();
                    break;
                case 'importData':
                    this.manager.promptManager.importData();
                    break;
                case 'createNewPrompt':
                    this.manager.createNewPrompt();
                    break;
                case 'closePromptModal':
                    this.manager.closePromptModal();
                    break;
                case 'generateWithAI':
                    this.manager.generateWithAI();
                    break;
                case 'acceptAIResult':
                    this.manager.acceptAIResult();
                    break;
                case 'retryGeneration':
                    this.manager.retryGeneration();
                    break;
                case 'manualEdit':
                    this.manager.manualEdit();
                    break;
                case 'showVariableHelp':
                    this.manager.showVariableHelp();
                    break;
                case 'closeVariableHelp':
                    this.manager.closeVariableHelp();
                    break;
                case 'closeManagementPanel':
                    this.close();
                    break;

                case 'goToStep1':
                    this.manager.editorPanel.goToStep(1);
                    break;
                case 'goToStep2':
                    this.manager.editorPanel.goToStep(2);
                    break;
                default:
                    if (typeof this.manager[action] === 'function') {
                        this.manager[action]();
                    } else {
                        logger.warn(`Unknown action: ${action}`);
                    }
                    break;
            }
        };

        panel.addEventListener('click', handleAction);
        panel.addEventListener('change', (e) => {
            const actionTarget = e.target.closest('[data-action]');
            if (actionTarget && actionTarget.dataset.action === 'updatePromptCategory') {
                handleAction(e);
            }
        });

        panel.dataset.actionsBound = 'true';
    }

    setupKeyboard(panel) {
        if (!panel) return;

        if (panel._mgmtSelection && panel._mgmtSelection.handleKeyDown) {
            panel.removeEventListener('keydown', panel._mgmtSelection.handleKeyDown);
            panel._mgmtSelection = null;
        }

        panel._mgmtSelection = KeyboardNavigation.setup(panel, {
            containerSelector: '#prompt-list-container',
            itemSelector: '.prompt-item--detailed',
            onEnter: (el) => {
                const id = el?.dataset?.promptId;
                if (id) this.manager.editPrompt(id);
            },
            onClose: () => this.close(),
            panelManager: this.manager
        });
    }

    adjustPosition(panel) {
        // No-op, positioning is now handled by CSS.
    }

    _calculatePageSize() {
        // Fully dynamic calculation based on actual DOM measurements
        const listContainer = document.getElementById('prompt-list-container');
        const panel = document.getElementById('prompt-management-panel');
        const footer = document.getElementById('management-panel-footer');

        if (!listContainer || !panel || panel.offsetHeight === 0) {
            // Fallback to default if elements not ready or hidden
            if (this.state.pagination && this.state.pagination.management) {
                // Only set if not already set to something reasonable
                if (!this.state.pagination.management.itemsPerPage || this.state.pagination.management.itemsPerPage < 5) {
                    this.state.pagination.management.itemsPerPage = 5;
                }
            }
            return;
        }

        // Get computed styles to account for any padding/margin
        const listStyle = getComputedStyle(listContainer);
        const listPaddingTop = parseFloat(listStyle.paddingTop) || 0;
        const listPaddingBottom = parseFloat(listStyle.paddingBottom) || 0;

        // Get actual dimensions
        const panelRect = panel.getBoundingClientRect();
        const listRect = listContainer.getBoundingClientRect();
        // FIX: Use fixed height if footer measurement is 0 (e.g. hidden or not rendered yet)
        const footerHeight = (footer && footer.getBoundingClientRect().height) || 48;

        // Calculate available height for list items
        // Available = from list content start to panel bottom - footer height
        // We don't subtract listPaddingBottom here because it's at the end of the scrollable content,
        // not necessarily reducing the visible viewport for items.
        const availableHeight = panelRect.bottom - listRect.top - footerHeight - listPaddingTop - 8;

        // Measure actual item dimensions from existing items
        const existingItems = listContainer.querySelectorAll('.prompt-item--detailed');
        let itemHeight = 0;
        let itemGap = 12; // Default gap

        if (existingItems.length > 0) {
            // Use the first item's height
            itemHeight = existingItems[0].offsetHeight;

            if (existingItems.length >= 2) {
                // Calculate gap from distance between items
                const firstRect = existingItems[0].getBoundingClientRect();
                const secondRect = existingItems[1].getBoundingClientRect();
                itemGap = secondRect.top - firstRect.bottom;
            }
        }

        // Fallback if no items measured
        if (itemHeight === 0) {
            itemHeight = 90; // Approximate height for detailed item
            itemGap = 12;
        }

        // Total height per item = item height + gap
        const totalItemHeight = itemHeight + itemGap;

        // Calculate items per page - must fit completely without scrolling
        // Use floor but allow a slightly tighter fit with a small tolerance
        let itemsPerPage = Math.floor((availableHeight + itemGap + 2) / totalItemHeight);

        // If we are very close to fitting another item (e.g. within 15px), allow it
        const remainder = (availableHeight + itemGap + 2) % totalItemHeight;
        if (remainder > totalItemHeight - 15) {
            itemsPerPage++;
        }

        // Ensure reasonable minimum based on available height
        // If height > 400px, we should definitely have at least 5 items
        const minItems = availableHeight > 400 ? 5 : 3;
        itemsPerPage = Math.max(minItems, itemsPerPage);

        if (this.state.pagination && this.state.pagination.management) {
            // Only update if changed or not set
            if (this.state.pagination.management.itemsPerPage !== itemsPerPage) {
                this.state.pagination.management.itemsPerPage = itemsPerPage;
                logger.debug(`[Management] Dynamic page size: ${itemsPerPage} items ` +
                    `(available: ${availableHeight.toFixed(0)}px, item: ${itemHeight.toFixed(0)}px, gap: ${itemGap.toFixed(0)}px, total: ${totalItemHeight.toFixed(0)}px)`);
            }
        }
    }

    updateCategoryList() {
        const list = document.getElementById('category-list');
        if (list && this.categoryFilter) {
            this.categoryFilter.update({
                prompts: this.promptManager.prompts,
                categories: this.promptManager.categories
            });
        }
    }

    updatePromptList(promptsToDisplay = null, filter = null) {
        const container = document.getElementById('prompt-list-container');
        if (!container) return;

        // State-aware fallback: Use current category and search query if not provided
        let filteredPrompts = promptsToDisplay;
        if (filteredPrompts === null) {
            const categoryId = this.state.currentManagementCategoryId || 'all';
            if (categoryId === 'all') {
                filteredPrompts = this.promptManager.prompts;
            } else if (categoryId === 'uncategorized') {
                filteredPrompts = this.promptManager.prompts.filter(p => !p.category || p.category === 'null');
            } else {
                filteredPrompts = this.promptManager.prompts.filter(p => p.category === categoryId);
            }
        }

        let currentFilter = filter;
        if (currentFilter === null) {
            const searchInput = document.querySelector('#prompt-management-panel .main-search');
            currentFilter = searchInput ? searchInput.value : '';
        }

        if (currentFilter) {
            const lowerCaseFilter = currentFilter.toLowerCase();
            filteredPrompts = filteredPrompts.filter(p =>
                p.title.toLowerCase().includes(lowerCaseFilter) ||
                p.content.toLowerCase().includes(lowerCaseFilter)
            );
        }

        // --- Pagination Logic ---
        const pageState = this.state.pagination.management;
        pageState.totalItems = filteredPrompts.length;
        const totalPages = Math.ceil(pageState.totalItems / pageState.itemsPerPage) || 1;
        pageState.currentPage = Math.max(1, Math.min(pageState.currentPage, totalPages));

        const startIndex = (pageState.currentPage - 1) * pageState.itemsPerPage;
        const endIndex = startIndex + pageState.itemsPerPage;
        const promptsForPage = filteredPrompts.slice(startIndex, endIndex);

        this._renderPrompts(container, promptsForPage, 'detailed');
        if (this.pagination) {
            this.pagination.render(this.state.pagination.management.currentPage, totalPages);
        }
    }

    filterPrompts(query) {
        // Reset page number when searching
        this.state.pagination.management.currentPage = 1;

        const activeCategory = document.querySelector('.category-item.active');
        const categoryId = activeCategory ? activeCategory.dataset.categoryId : 'all';

        let promptsToShow = this.promptManager.prompts;
        if (categoryId === 'uncategorized') {
            promptsToShow = this.promptManager.prompts.filter(p => !p.category || p.category === 'null');
        } else if (categoryId !== 'all') {
            promptsToShow = this.promptManager.prompts.filter(p => p.category === categoryId);
        }

        this.updatePromptList(promptsToShow, query);
    }

    filterByCategory(categoryId) {
        if (!this.promptManager) return;

        this.state.currentManagementCategoryId = categoryId;
        this.state.pagination.management.currentPage = 1; // Reset page number when switching category

        // Update filter component state so keyboard navigation knows the current category
        if (this.categoryFilter) {
            this.categoryFilter.update({ activeCategoryId: categoryId });
        }

        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`.category-item[data-category-id="${categoryId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        const searchInput = document.querySelector('#prompt-management-panel .main-search');
        const currentQuery = searchInput ? searchInput.value : '';

        let filteredPrompts;
        if (categoryId === 'all') {
            filteredPrompts = this.promptManager.prompts;
        } else if (categoryId === 'favorites') {
            filteredPrompts = this.promptManager.prompts.filter(p => p.isFavorite);
        } else if (categoryId === 'uncategorized') {
            filteredPrompts = this.promptManager.prompts.filter(p => !p.category || p.category === 'null');
        } else {
            filteredPrompts = this.promptManager.prompts.filter(p => p.category === categoryId);
        }

        this.updatePromptList(filteredPrompts, currentQuery);
    }

    changePage(direction) {
        const pageState = this.state.pagination.management;
        const totalPages = Math.ceil(pageState.totalItems / pageState.itemsPerPage);

        if (direction === 'next' && pageState.currentPage < totalPages) {
            pageState.currentPage++;
        } else if (direction === 'prev' && pageState.currentPage > 1) {
            pageState.currentPage--;
        }

        // Use state-aware updatePromptList (maintains current category and search)
        this.updatePromptList();
    }
    _renderPrompts(container, prompts, viewType) {
        if (!this.promptManager || !container) return;

        container.innerHTML = '';

        if (prompts.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'prompt-item empty-state';
            emptyItem.innerHTML = `
                <div class="prompt-title">${i18n.t('no_prompts')}</div>
                <div class="prompt-preview">${i18n.t('no_prompts_hint')}</div>
            `;
            container.appendChild(emptyItem);
            return;
        }

        prompts.forEach(prompt => {
            const item = new PromptItem(prompt, viewType, this.promptManager.categories, {
                onInsert: (p, e) => this.manager.insertPrompt(p, e),
                onFavorite: (id) => this.manager.toggleFavorite(id),
                onEdit: (id) => this.manager.editPrompt(id),
                onDelete: (id) => this.deletePrompt(id),
                onUpdateCategory: (id, catId) => this.updatePromptCategory(id, catId)
            }).element;
            if (viewType === 'compact' && prompt._matches) {
                const highlightedTitle = HighlightUtils.highlightMatches(prompt.title, prompt._matches, 'title');
                const highlightedContent = HighlightUtils.highlightMatches(
                    prompt.content.substring(0, 50) + (prompt.content.length > 50 ? '...' : ''),
                    prompt._matches,
                    'content'
                );
                item.querySelector('.prompt-title').innerHTML = highlightedTitle;
                item.querySelector('.prompt-preview').innerHTML = highlightedContent;
            }
            container.appendChild(item);
        });
    }



    async deletePrompt(promptId) {
        if (!this.promptManager) return;

        const prompt = this.promptManager.getPromptById(promptId);
        if (!prompt) {
            this.domUtils.showAlert(i18n.t('prompt_not_found'));
            return;
        }

        const confirmed = await this.domUtils.showConfirm(i18n.t('confirm_delete_prompt_message').replace('{title}', prompt.title));

        if (confirmed) {
            try {
                await this.promptManager.deletePrompt(prompt.id);

                // Rebuild search index
                if (this.manager.rebuildSearchIndex) {
                    this.manager.rebuildSearchIndex();
                }

                // Refresh list
                const searchInput = document.querySelector('#prompt-management-panel .main-search');
                const query = searchInput ? searchInput.value : '';
                this.updatePromptList(this.promptManager.prompts, query);

                // Update category count
                this.updateCategoryList();

                // If currently in quick panel, refresh it too
                if (this.manager.quickInsertPanel) {
                    this.manager.quickInsertPanel.updateList();
                }

                // Show success toast
                this.domUtils.showToast(i18n.t('prompt_deleted'), 'success');
            } catch (error) {
                logger.error('Delete prompt failed:', error);
                this.domUtils.showAlert(`${i18n.t('delete_failed')}${error.message}`);
            }
        }
    }

    async updatePromptCategory(promptId, categoryId) {
        if (!this.promptManager) return;

        try {
            const prompt = this.promptManager.getPromptById(promptId);
            if (!prompt) throw new Error('Prompt not found');

            const updatedData = { ...prompt, category: categoryId };
            await this.promptManager.updatePrompt(promptId, updatedData);

            // Update sidebar category list (refresh count)
            this.updateCategoryList();

        } catch (error) {
            logger.error('Quick update category failed:', error);
            this.domUtils.showAlert(`${i18n.t('update_category_failed')}${error.message}`);
            // Revert UI on failure
            this.updatePromptList();
        }
    }

    // Import/Export
    exportPrompts() {
        if (!this.promptManager) return;

        const data = {
            prompts: this.promptManager.prompts,
            categories: this.promptManager.categories,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompts_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importPrompts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.prompts && Array.isArray(data.prompts)) {
                        const importedPromptCount = data.prompts.length;

                        if (confirm(i18n.t('found_prompts_import_confirm').replace('{count}', importedPromptCount))) {
                            const result = await this.promptManager.importPrompts(data);
                            this.updatePromptList();
                            this.updateCategoryList();
                            this.domUtils.showAlert(i18n.t('import_success_message')
                                .replace('{imported}', result.importedCount)
                                .replace('{skipped}', result.skippedCount));
                        }
                    } else {
                        this.domUtils.showAlert(i18n.t('invalid_file_format'));
                    }
                } catch (error) {
                    this.domUtils.showAlert(`${i18n.t('file_parse_failed')}${error.message}`);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }


    _createCategoryModal() {
        const modal = new CategoryModal({
            onSubmit: (data) => this.saveCategory(data),
            onClose: () => this.closeCategoryModal()
        });
        this.categoryModal = modal;
        return modal.element;
    }

    openCategoryModal(category = null) {
        if (!this.categoryModal) {
            // Should be created in create(), but just in case
            const modalElement = this._createCategoryModal();
            document.getElementById('prompt-enhancement-system').appendChild(modalElement);
        }

        this.categoryModal.open(category);
        this.state.isModalOpen = true;
    }

    closeCategoryModal() {
        if (this.categoryModal) {
            this.categoryModal.close();
        }
        this.state.isModalOpen = false;
    }

    async saveCategory(data) {
        const id = data.id;
        const name = data.name;
        const icon = data.icon;

        if (!name) {
            this.domUtils.showAlert(i18n.t('category_name_required'));
            return;
        }

        let categoryToSave;

        if (id) {
            // Update existing category
            const localCategory = this.promptManager.categories.find(c => c.id === id);
            if (localCategory) {
                categoryToSave = { ...localCategory, name: name, icon: icon };
            }
        } else {
            // Create new
            categoryToSave = {
                id: generateUUID(),
                name: name,
                icon: icon || '📁', // Use selected icon or default
                color: '#a0aec0', // Default color (legacy)
                description: '',
                order: this.promptManager.categories.length + 1
            };
        }

        if (categoryToSave) {
            await this.promptManager.upsertCategory(categoryToSave);

            this.updateCategoryList();
            if (this.manager.quickInsertPanel) {
                this.manager.quickInsertPanel.updateCategories();
            }
            this.updatePromptList();
            this.closeCategoryModal();
        }
    }

    addNewCategory() {
        this.openCategoryModal();
    }

    // editCategory removed as it is replaced by inline editing

    async deleteCategory(categoryId) {
        if (await this.domUtils.showConfirm(i18n.t('confirm_delete_category'))) {
            // Move prompts to uncategorized
            this.promptManager.prompts.forEach(p => {
                if (p.category === categoryId) {
                    p.category = null;
                }
            });

            // Save prompt updates (uncategorization)
            this.promptManager.saveData();

            // Delete category via manager (handles metadata and cache)
            await this.promptManager.deleteCategory(categoryId);

            this.updateCategoryList();
            if (this.manager.quickInsertPanel) {
                this.manager.quickInsertPanel.updateCategories();
            }
            this.updatePromptList();
        }
    }
}
