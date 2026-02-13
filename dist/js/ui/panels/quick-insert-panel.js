import { i18n } from '../../core/i18n.js';
import { logger } from '../../core/logger.js';
import { Header } from '../components/header.js';
import { SearchBar } from '../components/search-bar.js';
import { CategoryFilter } from '../components/category-filter.js';
import { Pagination } from '../components/pagination.js';
import { KeyboardNavigation } from '../utils/keyboard-nav.js';
import { PromptItem } from '../components/prompt-item.js';
import { HighlightUtils } from '../utils/highlight-utils.js';

export class QuickInsertPanel {
    constructor(manager) {
        this.manager = manager;
        this._lastQuery = '';
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
        if (document.getElementById('quick-insert-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'quick-insert-panel';
        panel.className = 'unified-panel unified-panel-modal unified-panel--quick-insert';
        // Use visibility: hidden instead of display: none to ensure layout is calculated
        panel.style.visibility = 'hidden';

        // Create overall fixed header container
        const headerContainer = document.createElement('div');
        headerContainer.className = 'panel-header-container';

        const header = new Header(i18n.t('quick_insert'), [{
            title: i18n.t('new_prompt'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>',
            action: 'createNewPromptViaQuickPanel',
            className: 'btn-icon-only'
        }, {
            title: i18n.t('manage_prompts'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
            action: 'navigateToManagementPanel',
            className: 'btn-icon-only'
        }, {
            title: i18n.t('close'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>',
            id: 'pes-quick-close-btn', // Direct binding ID
            action: 'closeQuickInsertPanel',
            className: 'btn-icon-only btn-close'
        }]).element;

        // Create a container for the fixed header elements
        const fixedHeaderContainer = document.createElement('div');
        fixedHeaderContainer.className = 'panel-fixed-header flex-shrink-0';

        const searchBar = new SearchBar({
            containerClass: 'search-bar-container',
            inputClass: 'quick-search',
            placeholder: i18n.t('search_prompts_placeholder'),
            oninput: (e) => this.filter(e.target.value)
        }).element;

        this.categoryFilter = new CategoryFilter({
            categories: this.promptManager.categories,
            prompts: this.promptManager.prompts,
            activeCategoryId: this.state.currentQuickCategoryId,
            displayMode: 'tabs',
            callbacks: {
                onFilter: (id) => this.filterByCategory(id)
            }
        });
        const categoryTabs = this.categoryFilter.element;

        // Inline hint bar
        const hint = document.createElement('div');
        hint.className = 'hint-inline';
        hint.innerHTML = i18n.t('hint_inline');

        // Append fixed elements to their container
        fixedHeaderContainer.append(searchBar, hint, categoryTabs);

        // Append header and fixed elements to the overall container
        headerContainer.append(header, fixedHeaderContainer);

        // Create the list container (scrollable)
        const list = document.createElement('div');
        list.className = 'flex-1 p-2 min-h-0 overflow-y-auto';
        list.id = 'quick-prompt-list';

        // Create a footer for the pager
        const footer = document.createElement('div');
        footer.id = 'quick-panel-footer';
        footer.className = 'flex-shrink-0 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center';
        footer.style.cssText = 'display: flex; align-items: center; justify-content: center; min-height: 40px;';

        // Append all main components to the panel
        panel.append(headerContainer, list, footer);
        container.appendChild(panel);

        // Initialize pagination component
        if (!this.pagination) {
            this.pagination = new Pagination(footer, {
                onPageChange: (direction) => this.changePage(direction)
            });
        }

        // Calculate page size before first render
        this._calculatePageSize();
        this.updateList();
        this.setupKeyboard(panel);
        this.setupSelection(panel);
        this.setupActions(panel);

        // FIX: Attach direct .onclick listeners to problematic buttons to ensure they fire.
        const closeBtn = panel.querySelector('#pes-quick-close-btn');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                logger.debug('Direct .onclick for close button fired.');
                // Close all directly to avoid any stacked state causing close failure
                this.manager.closeAllPanels();
            };
        }

        const helpBtn = panel.querySelector('#pes-show-help-btn');
        if (helpBtn) {
            helpBtn.removeAttribute('data-action');

            // Top-level capture intercepts pointerdown at element level, preventing host from closing panel in capture phase
            helpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.manager._suppressGlobalCloseOnce = true;
            }, true);

            helpBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Strong interception, preventing any global close logic
                logger.debug('Direct .onclick for help button fired.');
                // Suppress panel close caused by this external click
                this.manager._suppressGlobalCloseOnce = true;
                this.manager.toggleShortcutHelp();
            };
        }

        // Also bind strong interception for "? Help" in hint bar, avoiding panel close after click
        const hintHelpLink = panel.querySelector('.hint-inline [data-action="toggleShortcutHelp"]');
        if (hintHelpLink) {
            if (hintHelpLink.getAttribute('href') !== 'javascript:void(0)') {
                hintHelpLink.setAttribute('href', 'javascript:void(0)');
            }
            hintHelpLink.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.manager._suppressGlobalCloseOnce = true;
            }, true);
            hintHelpLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.manager._suppressGlobalCloseOnce = true;
                this.manager.toggleShortcutHelp();
            });
        }
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

            const card = actionTarget.closest('.prompt-item--detailed') || actionTarget.closest('.prompt-item--compact');
            const promptId = actionTarget.dataset.promptId || card?.dataset.promptId;
            const categoryId = actionTarget.dataset.categoryId;

            switch (action) {
                case 'prevPage':
                case 'nextPage':
                    this.changePage(action.replace('Page', '').toLowerCase());
                    break;
                case 'createNewPromptViaQuickPanel':
                    this.manager.navigateToManagementPanel();
                    this.manager.createNewPrompt();
                    break;
                case 'navigateToManagementPanel':
                    this.manager.navigateToManagementPanel();
                    break;
                case 'closeQuickInsertPanel':
                    this.close();
                    break;
                case 'editPrompt':
                    if (promptId) this.manager.editPrompt(promptId);
                    break;
                case 'deletePrompt':
                    if (promptId) this.manager.managementPanel.deletePrompt(promptId);
                    break;
                case 'toggleFavorite':
                    if (promptId) this.manager.toggleFavorite(promptId);
                    break;
                case 'filterByCategory':
                    if (categoryId) this.filterByCategory(categoryId);
                    break;
                case 'showVariableHelp':
                    this.manager.showVariableHelp();
                    break;
                case 'closeVariableHelp':
                    this.manager.closeVariableHelp();
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
        panel.dataset.actionsBound = 'true';
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
            // Reset activePanel state since panels were destroyed
            this.state.activePanel = null;
        }
        this.state.lastRenderedLang = i18n.lang;

        let quickPanel = document.getElementById('quick-insert-panel');

        logger.debug('[QuickInsert] toggle: activePanel=%s, quickPanel=%s', this.state.activePanel, !!quickPanel);

        if (this.state.activePanel === 'quick') {
            this.close();
            return;
        } else if (this.state.activePanel) {
            this.manager.closeAllPanels();
        }

        if (!quickPanel) {
            this.manager.rootContainer = this.domUtils.ensureRootContainer();
            this.create(this.manager.rootContainer);
            quickPanel = document.getElementById('quick-insert-panel');
            this.state.quickPanelCreated = true;
        }

        // Re-query triggerBtn after potential DOM changes to ensure it's valid
        const triggerBtn = document.getElementById('prompt-manager-integrated-btn');

        if (quickPanel && triggerBtn) {
            // Upgrade existing panel structure: Ensure list container and pagination area exist and are visible (adapt to old instances)
            const listEl = quickPanel.querySelector('#quick-prompt-list');
            if (listEl) {
                listEl.className = 'flex-1 p-2 min-h-0'; // overflow is handled dynamically
            }
            let footer = document.getElementById('quick-panel-footer') || quickPanel.querySelector('#quick-panel-footer');
            if (!footer) {
                footer = document.createElement('div');
                footer.id = 'quick-panel-footer';
                footer.className = 'flex-shrink-0 border-t border-gray-100 dark:border-gray-800';
                footer.style.display = 'block';
                quickPanel.appendChild(footer);
            }

            if (!this.pagination) {
                this.pagination = new Pagination(footer, {
                    onPageChange: (direction) => this.changePage(direction)
                });
            }

            this.domUtils.createOverlay('quick');
            quickPanel.style.position = 'fixed';
            quickPanel.style.display = 'flex';
            quickPanel.style.flexDirection = 'column'; // Ensure vertical layout
            quickPanel.style.zIndex = '2147483000';
            quickPanel.style.opacity = '1';
            quickPanel.style.visibility = 'visible';
            // Limit height to fit viewport, prohibit exceeding needing to scroll page
            this.manager._panelViewportGap = this.manager._panelViewportGap || 48; // Reserve 48px margin top and bottom
            quickPanel.style.maxHeight = `calc(100vh - ${this.manager._panelViewportGap}px)`;
            quickPanel.style.overflow = 'hidden';
            // Lock background scroll to prevent panel from being "pushed out" of visible range
            this.scrollUtils.lockBackgroundScroll();
            this.state.activePanel = 'quick';
            // Ensure the quick panel is positioned on screen relative to the trigger button
            this.adjustPosition(quickPanel, triggerBtn);

            // First render with default page size to populate DOM
            this.updateList();

            if (typeof quickPanel.tabIndex !== 'number' || quickPanel.tabIndex < 0) {
                quickPanel.tabIndex = 0;
            }
            try {
                quickPanel.focus({ preventScroll: true });
            } catch (err) {
                quickPanel.focus();
            }

            this.state.justOpenedQuickPanel = true;
            // Default to 'all' category as per user feedback
            this.state.currentQuickCategoryId = 'all';
            this.updateCategories();
            this.filterByCategory('all');

            // Defer page size calculation until after DOM is fully rendered
            requestAnimationFrame(() => {
                this._calculatePageSize();
                // Re-render with accurate page size
                this.updateList();
                if (quickPanel && quickPanel._quickSelection) {
                    const { getSelectedIndex, setSelection, updateItems } = quickPanel._quickSelection;
                    updateItems();
                    const selectedIndex = getSelectedIndex();

                    if (selectedIndex === -1) {
                        setSelection(0);
                    } else {
                        setSelection(selectedIndex);
                    }
                }
            });
        }
    }

    close() {
        // If help modal is currently open or visible, do not close quick panel
        const helpModal = document.getElementById('shortcut-help-modal');
        const helpVisible = helpModal && helpModal.classList.contains('is-visible');
        if (this.manager._suppressGlobalCloseOnce || helpVisible) {
            this.manager._suppressGlobalCloseOnce = false;
            return;
        }

        const panel = document.getElementById('quick-insert-panel');
        if (panel) {
            panel.style.display = 'none';
            // Also hide visibility to match create state
            panel.style.visibility = 'hidden';
            this.domUtils.removeOverlay();
            // Restore background scrolling
            this.scrollUtils.unlockBackgroundScroll();
        }
        // Unconditionally reset state, even if panel DOM is missing (e.g. destroyed by language change)
        this.state.activePanel = null;
    }

    updateList(prompts = null, selectionIndex = 0) {
        const list = document.getElementById('quick-prompt-list');
        if (!list) return;

        let allFilteredPrompts = prompts;
        if (allFilteredPrompts === null) {
            const categoryId = this.state.currentQuickCategoryId || 'all';
            if (categoryId === 'all') {
                allFilteredPrompts = this.promptManager.prompts;
            } else if (categoryId === 'favorites') {
                allFilteredPrompts = this.promptManager.prompts.filter(p => p.isFavorite);
            } else {
                allFilteredPrompts = this.promptManager.prompts.filter(p => p.category === categoryId);
            }

            // Sort by favorite and usage
            allFilteredPrompts = [...allFilteredPrompts]
                .sort((a, b) => {
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
                    return (b.createdAt || 0) - (a.createdAt || 0);
                });
        }

        // --- PAGINATION LOGIC ---
        const pageState = this.state.pagination.quick;
        pageState.totalItems = allFilteredPrompts.length;
        const totalPages = Math.ceil(pageState.totalItems / pageState.itemsPerPage);
        pageState.currentPage = Math.max(1, Math.min(pageState.currentPage, totalPages)); // Clamp currentPage
        logger.debug('[QuickList] totalItems=%d, totalPages=%d, currentPage=%d', pageState.totalItems, totalPages, pageState.currentPage);

        const startIndex = (pageState.currentPage - 1) * pageState.itemsPerPage;
        const endIndex = startIndex + pageState.itemsPerPage;
        const promptsForPage = allFilteredPrompts.slice(startIndex, endIndex);

        this._renderPrompts(list, promptsForPage, 'compact');
        if (this.pagination) {
            this.pagination.render(this.state.pagination.quick.currentPage, totalPages);
        }
        this.updateCategories();
        // Secondary calibration: After rendering and generating pagination area, recalibrate container and items per page to ensure no scrolling
        // Note: _ensureQuickPageFits is in manager, might need to move or call
        // Assuming it's in manager for now
        if (this.manager._ensureQuickPageFits) {
            this.manager._ensureQuickPageFits(allFilteredPrompts, selectionIndex);
        }

        // After rendering, we MUST update the keyboard navigation's item list
        // to ensure it's aware of the new DOM elements.
        const quickPanel = document.getElementById('quick-insert-panel');
        if (quickPanel && quickPanel._quickSelection) {
            const selectionInstance = quickPanel._quickSelection;
            selectionInstance.updateItems();

            let idx = 0;
            if (this.state.justOpenedQuickPanel) {
                // On first open, select the most used prompt
                if (Array.isArray(allFilteredPrompts) && allFilteredPrompts.length > 0) {
                    let maxUsage = -Infinity;
                    allFilteredPrompts.forEach((p, i) => {
                        const usage = typeof p.usageCount === 'number' ? p.usageCount : 0;
                        if (usage > maxUsage) {
                            maxUsage = usage;
                            idx = i;
                        }
                    });
                }
                this.state.justOpenedQuickPanel = false;
            } else {
                idx = selectionIndex;
            }

            if (idx === 'last') {
                const items = selectionInstance.getItems();
                idx = items.length > 0 ? items.length - 1 : 0;
            }

            selectionInstance.setSelection(idx);
        }
    }

    filter(query, selectionIndex = 0) {
        // Reset page to 1 on new search, but not on re-renders from page changes
        if (query !== (this._lastQuery || '')) {
            this.state.pagination.quick.currentPage = 1;
        }
        this._lastQuery = query;

        if (!this.promptManager) return;

        const list = document.getElementById('quick-prompt-list');
        if (!list) return;

        // Ensure search feature is initialized
        if (!this.manager.simpleSearch) {
            this.manager.initializeSearchFeatures();
        }

        if (!query.trim()) {
            this.updateList(null, selectionIndex);
            return;
        }

        let filteredPrompts = [];

        if (this.manager.simpleSearch) {
            // Use simple search for searching
            const results = this.manager.simpleSearch.search(query);
            filteredPrompts = results.map(({ item, score, matches }) => {
                const temp = { ...item };
                temp._searchScore = score;
                temp._matches = matches;
                return temp;
            });
        } else {
            // Fallback: Basic string matching
            filteredPrompts = this.promptManager.prompts.filter(p =>
                p.title.toLowerCase().includes(query.toLowerCase()) ||
                p.content.toLowerCase().includes(query.toLowerCase())
            );
        }

        this.updateList(filteredPrompts, selectionIndex);
    }

    filterByCategory(categoryId) {
        this.state.pagination.quick.currentPage = 1; // Reset to first page on filter change
        logger.debug('Filtering category:', categoryId);
        this.state.currentQuickCategoryId = categoryId;

        // Re-render the category tabs to correctly apply active styles
        this.updateCategories();

        let prompts;
        if (categoryId === 'all') {
            prompts = this.promptManager.prompts;
            logger.debug('Showing all prompts:', prompts.length);
        } else if (categoryId === 'favorites') {
            prompts = this.promptManager.prompts.filter(p => p.isFavorite);
            logger.debug('Showing favorite prompts:', prompts.length);
        } else if (categoryId === 'uncategorized') {
            prompts = this.promptManager.prompts.filter(p => !p.category || p.category === 'null');
            logger.debug('Showing uncategorized prompts:', prompts.length);
        } else {
            prompts = this.promptManager.prompts.filter(p => p.category === categoryId);
            logger.debug('Showing category prompts:', categoryId, prompts.length);
        }

        this.updateList(prompts);

        // FIX: After re-rendering the tabs, focus is lost. Restore focus to the main panel
        // so that keyboard navigation (like left/right arrows for categories) continues to work.
        const quickPanel = document.getElementById('quick-insert-panel');
        if (quickPanel && document.activeElement !== quickPanel) {
            try {
                quickPanel.focus({ preventScroll: true });
            } catch (err) {
                quickPanel.focus();
            }
        }
    }

    updateCategories() {
        const container = document.getElementById('quick-panel-categories');
        if (container && this.categoryFilter) {
            this.categoryFilter.update({
                activeCategoryId: this.state.currentQuickCategoryId,
                prompts: this.promptManager.prompts,
                categories: this.promptManager.categories
            });
        }
    }

    getCategoryTabs() {
        const container = document.getElementById('quick-panel-categories');
        if (!container) return [];
        return Array.from(container.querySelectorAll('.category-tab'));
    }

    cycleCategory(direction = 'next') {
        const tabs = this.getCategoryTabs();
        if (!tabs.length) return;
        const activeIdx = tabs.findIndex(t => t.classList.contains('active'));
        const idx = activeIdx < 0 ? 0 :
            (direction === 'prev'
                ? (activeIdx - 1 + tabs.length) % tabs.length
                : (activeIdx + 1) % tabs.length);
        tabs[idx].click();
    }

    setupKeyboard(panel) {
        if (!panel) return;

        // Use capture phase to ensure Tab is intercepted even inside input box
        panel.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            // Only effective when quick panel is visible
            if (panel.style.display === 'none') return;

            e.preventDefault();

            const searchInput = panel.querySelector('.quick-search');
            const categoryTabs = document.getElementById('quick-panel-categories');
            const firstCategory = categoryTabs ? categoryTabs.querySelector('.category-tab') : null;
            const promptList = document.getElementById('quick-prompt-list');
            const firstPrompt = promptList ? promptList.querySelector('.prompt-item--compact') : null;

            const focusables = [];
            if (searchInput) focusables.push(searchInput);
            if (firstCategory) focusables.push(firstCategory);
            if (firstPrompt) focusables.push(firstPrompt);

            if (focusables.length === 0) return;

            const active = document.activeElement;
            let idx = focusables.findIndex(el => el === active || (el.contains && el.contains(active)));

            if (e.shiftKey) {
                // Cycle backward
                if (idx === -1) idx = 0;
                idx = (idx - 1 + focusables.length) % focusables.length;
            } else {
                // Cycle forward
                idx = (idx + 1) % focusables.length;
            }

            const next = focusables[idx];
            if (next) {
                // If target is not focusable, ensure it has tabindex
                if (typeof next.tabIndex === 'number' && next.tabIndex < 0) {
                    next.tabIndex = 0;
                    const cleanup = () => {
                        try { next.removeAttribute('tabindex'); } catch (err) { }
                        next.removeEventListener('blur', cleanup);
                    };
                    next.addEventListener('blur', cleanup);
                }
                next.focus();
                // If it's a list item, ensure it's visible
                if (typeof next.scrollIntoView === 'function') {
                    next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }
        }, true);

        // Ensure panel itself can receive key events (optional)
        if (typeof panel.tabIndex === 'number' && panel.tabIndex < 0) {
            panel.tabIndex = 0;
        }
    }

    setupSelection(panel) {
        if (!panel) return;

        // Clean up old listeners
        if (panel._quickSelection && panel._quickSelection.handleKeyDown) {
            panel.removeEventListener('keydown', panel._quickSelection.handleKeyDown);
            panel._quickSelection = null;
        }

        panel._quickSelection = KeyboardNavigation.setup(panel, {
            containerSelector: '#quick-prompt-list',
            itemSelector: '.prompt-item--compact',
            onEnter: (el) => {
                el.click(); // Simulate click to insert
            },
            onClose: () => this.close(),
            panelManager: this.manager
        });

        // Bind quick category and help keys (Quick panel only)
        if (panel._quickExtraKeys) {
            panel.removeEventListener('keydown', panel._quickExtraKeys);
        }
        panel._quickExtraKeys = (e) => {
            const searchInput = panel.querySelector('.quick-search');
            const isSearchFocused = searchInput && document.activeElement === searchInput;

            // ? Open/Close Help
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                e.preventDefault();
                this.manager.toggleShortcutHelp();
                return;
            }

            // Do not grab left/right keys when search box is focused
            if (isSearchFocused) return;

            // ArrowLeft/ArrowRight are handled by KeyboardNavigation utility
            // to avoid double-triggering category cycle.

        };
        panel.addEventListener('keydown', panel._quickExtraKeys);
    }

    adjustPosition(panel, triggerBtn) {
        if (!panel || !triggerBtn) return;
        // Positioning handled by CSS transform, but keeping function for future use
        // or if we need to manually calculate position
    }

    changePage(direction) {
        const pageState = this.state.pagination.quick;
        const totalPages = Math.ceil(pageState.totalItems / pageState.itemsPerPage);

        const searchInput = document.querySelector('#quick-insert-panel .quick-search');
        const query = searchInput ? searchInput.value : '';

        if (direction === 'next' && pageState.currentPage < totalPages) {
            pageState.currentPage++;
        } else if (direction === 'prev' && pageState.currentPage > 1) {
            pageState.currentPage--;
        }

        // Reset selection to first item after page change (selectionIndex = 0)
        this.filter(query, 0);

        // Ensure keyboard selection is also reset to first item
        const quickPanel = document.getElementById('quick-insert-panel');
        if (quickPanel && quickPanel._quickSelection) {
            quickPanel._quickSelection.setSelection(0);
        }
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
                onFavorite: (id) => this.manager.toggleFavorite(id)
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
    _calculatePageSize() {
        // Fully dynamic calculation based on actual DOM measurements
        const list = document.getElementById('quick-prompt-list');
        const panel = document.getElementById('quick-insert-panel');
        const footer = document.getElementById('quick-panel-footer');

        if (!list || !panel) {
            // Fallback to default if elements not ready
            if (this.state.pagination && this.state.pagination.quick) {
                this.state.pagination.quick.itemsPerPage = 5;
            }
            return;
        }

        // Get computed styles to account for any padding/margin
        const listStyle = getComputedStyle(list);
        const listPaddingTop = parseFloat(listStyle.paddingTop) || 0;
        const listPaddingBottom = parseFloat(listStyle.paddingBottom) || 0;

        // Get actual dimensions
        const panelRect = panel.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        // FIX: Use fixed height if footer measurement is 0
        const footerHeight = (footer && footer.getBoundingClientRect().height) || 40;

        // Calculate available height for list items
        // Reduced buffer to 4px
        const availableHeight = panelRect.bottom - listRect.top - footerHeight - listPaddingTop - listPaddingBottom - 4;

        // Measure actual item dimensions from existing items
        const existingItems = list.querySelectorAll('.prompt-item--compact');
        let itemHeight = 0;
        let itemGap = 8; // Default gap for compact items

        if (existingItems.length >= 2) {
            // Measure actual gap between items
            const firstItem = existingItems[0].getBoundingClientRect();
            const secondItem = existingItems[1].getBoundingClientRect();
            itemHeight = firstItem.height;
            itemGap = secondItem.top - firstItem.bottom;
        } else if (existingItems.length === 1) {
            itemHeight = existingItems[0].getBoundingClientRect().height;
        } else {
            // No items yet, use a reasonable default for compact items
            itemHeight = 56;
        }

        // Total height per item = item height + gap
        const totalItemHeight = itemHeight + itemGap;

        // Calculate items per page - must fit completely without scrolling
        // Use floor but allow a slightly tighter fit
        // Add 1px tolerance to available height
        let itemsPerPage = Math.floor((availableHeight + itemGap + 4) / totalItemHeight);

        // Ensure reasonable minimum
        itemsPerPage = Math.max(4, itemsPerPage);

        if (this.state.pagination && this.state.pagination.quick) {
            // Only update if changed or not set
            if (this.state.pagination.quick.itemsPerPage !== itemsPerPage) {
                this.state.pagination.quick.itemsPerPage = itemsPerPage;
                logger.debug(`[QuickInsert] Dynamic page size: ${itemsPerPage} items ` +
                    `(available: ${availableHeight.toFixed(0)}px, item: ${itemHeight.toFixed(0)}px, gap: ${itemGap.toFixed(0)}px, total: ${totalItemHeight.toFixed(0)}px)`);
            }
        }
    }
}
