import { logger } from '../../core/logger.js';

/**
 * General List Keyboard Navigation Utility
 * Used for QuickInsertPanel and ManagementPanel
 */
export class KeyboardNavigation {
    /**
     * Setup list keyboard navigation
     * @param {HTMLElement} panel - Panel element
     * @param {Object} config - Configuration object
     * @param {string} config.containerSelector - List container selector
     * @param {string} config.itemSelector - List item selector
     * @param {Function} config.onEnter - Enter key callback (item, index) => void
     * @param {Function} config.onClose - ESC key callback () => void
     * @param {Object} config.panelManager - PanelManager instance (used to check modal state)
     */
    static setup(panel, {
        containerSelector,
        itemSelector,
        onEnter = (el) => { },
        onClose = () => { },
        panelManager
    }) {
        if (!panel) return null;

        let selectedIndex = -1;
        let items = [];

        const listContainer = () => panel.querySelector(containerSelector);

        const updateItems = () => {
            const container = listContainer();
            items = container ? Array.from(container.querySelectorAll(itemSelector)) : [];
        };

        const clearSelection = () => {
            items.forEach(el => el.classList.remove('keyboard-selected'));
            selectedIndex = -1;
        };

        const ensureVisible = (container, item) => {
            if (!container || !item) return;

            // Quick panel strictly prohibits scrolling, relies on pagination; thus no scroll correction
            if (container.id === 'quick-prompt-list') {
                return;
            }

            // Calculate offset relative to scroll container, avoiding misjudgment caused by transform/offsetParent differences
            const getRelativeOffsetTop = (el, ancestor) => {
                let top = 0;
                let node = el;
                while (node && node !== ancestor) {
                    top += node.offsetTop;
                    node = node.offsetParent;
                }
                return top;
            };

            const margin = 4; // Reserve a little visual buffer
            const containerHeight = container.clientHeight;
            const currentScrollTop = container.scrollTop;

            const itemTop = getRelativeOffsetTop(item, container);
            const itemBottom = itemTop + item.offsetHeight;

            const visibleTop = currentScrollTop;
            const visibleBottom = currentScrollTop + containerHeight;

            if (itemTop < visibleTop + margin) {
                // Item is above visible area
                container.scrollTop = Math.max(0, itemTop - margin);
            } else if (itemBottom > visibleBottom - margin) {
                // Item is below visible area
                container.scrollTop = itemBottom - containerHeight + margin;
            }
        };

        const setSelection = (index) => {
            clearSelection();
            // Also clear any mouse-hover states to avoid visual conflicts
            items.forEach(item => item.classList.remove('hover'));

            if (index >= 0 && index < items.length) {
                const el = items[index];
                el.classList.add('keyboard-selected');
                selectedIndex = index;
                // FIX: Use custom `ensureVisible` to scroll item into view within the list container.
                // This prevents the entire page from scrolling, which was the root cause of
                // the panel appearing to move and the pager being pushed off-screen.
                ensureVisible(listContainer(), el);
            }
        };

        // Mouse hover handling - Fix conflict between keyboard navigation and mouse interaction
        const setupMouseInteraction = () => {
            const container = listContainer();
            if (!container) return;

            container.addEventListener('mouseover', (e) => {
                const item = e.target.closest(itemSelector);
                if (item && items.includes(item)) {
                    // Do not clear keyboard selection on mouse hover, only add hover style
                    items.forEach(el => el.classList.remove('hover'));
                    item.classList.add('hover');
                }
            });

            container.addEventListener('mouseleave', () => {
                // Clear all hover styles when mouse leaves container
                items.forEach(el => el.classList.remove('hover'));
            });

            container.addEventListener('click', (e) => {
                const item = e.target.closest(itemSelector);
                if (item && items.includes(item)) {
                    // Click does not affect keyboard navigation state
                    const index = items.indexOf(item);
                    setSelection(index);
                }
            });
        };

        const handleKeyDown = (e) => {
            const panelType = panel.id.includes('quick') ? 'quick' : 'management';

            // If modal is open, completely disable panel keyboard navigation (except for Quick Panel)
            if (panelType !== 'quick' && panelManager && panelManager.state && panelManager.state.isModalOpen) {
                return;
            }

            // Check if panel is truly visible (handles both display:none and visibility:hidden)
            const isHidden = panel.style.display === 'none' ||
                panel.style.visibility === 'hidden' ||
                getComputedStyle(panel).display === 'none';
            if (isHidden) return;

            // Debug log
            logger.debug('KeyboardNav keydown:', e.key, 'Selected:', selectedIndex);

            // const panelType = panel.id.includes('quick') ? 'quick' : 'management'; // Already declared above
            const pageState = panelManager && panelManager.state ? panelManager.state.pagination[panelType] : null;

            // Support both search boxes
            const searchInput = panel.querySelector('.quick-search, .main-search');
            const isSearchFocused = searchInput && document.activeElement === searchInput;

            const refreshList = (selectionIndex = 0) => {
                // Just update the list, don't re-filter (which resets page)
                if (panelType === 'quick' && panelManager) {
                    panelManager.updateQuickPromptList();
                } else if (panelManager && panelManager.updatePromptList) {
                    panelManager.updatePromptList();
                }

                // Set selection after a short delay to allow DOM update
                setTimeout(() => {
                    updateItems();
                    if (items.length > 0) {
                        if (selectionIndex === 'last') {
                            setSelection(items.length - 1);
                        } else {
                            setSelection(selectionIndex);
                        }
                    }
                }, 50);
            };

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    updateItems(); // Refresh the list of items
                    if (items.length > 0) {
                        if (pageState && selectedIndex === items.length - 1 && pageState.currentPage < Math.ceil(pageState.totalItems / pageState.itemsPerPage)) {
                            // End of page, go to next page
                            pageState.currentPage++;
                            refreshList(0); // Select first item on new page
                        } else {
                            const next = selectedIndex === -1 ? 0 : Math.min(selectedIndex + 1, items.length - 1);
                            setSelection(next);
                        }
                    }
                    break;
                case 'ArrowLeft':
                    logger.debug('ArrowLeft pressed. panelManager:', !!panelManager);
                    if (isSearchFocused) return;
                    e.preventDefault();
                    if (panelManager) {
                        panelManager.cycleCategory('prev', panelType);
                    }
                    break;
                case 'ArrowRight':
                    logger.debug('ArrowRight pressed. panelManager:', !!panelManager);
                    if (isSearchFocused) return;
                    e.preventDefault();
                    if (panelManager) {
                        panelManager.cycleCategory('next', panelType);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    updateItems(); // Refresh the list of items
                    if (items.length > 0) {
                        if (pageState && selectedIndex === 0 && pageState.currentPage > 1) {
                            // Top of page, go to previous page
                            pageState.currentPage--;
                            refreshList('last'); // Select last item on new page
                        } else {
                            const prev = selectedIndex === -1 ? items.length - 1 : Math.max(selectedIndex - 1, 0);
                            setSelection(prev);
                        }
                    }
                    break;
                case 'Home':
                    e.preventDefault();
                    if (items.length > 0) setSelection(0);
                    break;
                case 'End':
                    e.preventDefault();
                    if (items.length > 0) setSelection(items.length - 1);
                    break;
                case 'PageDown':
                    e.preventDefault();
                    if (pageState && pageState.currentPage < Math.ceil(pageState.totalItems / pageState.itemsPerPage)) {
                        pageState.currentPage++;
                        refreshList();
                        setTimeout(() => setSelection(0), 50);
                    }
                    break;
                case 'PageUp':
                    e.preventDefault();
                    if (pageState && pageState.currentPage > 1) {
                        pageState.currentPage--;
                        refreshList();
                        setTimeout(() => setSelection(0), 50);
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    updateItems();
                    if (selectedIndex >= 0 && selectedIndex < items.length) {
                        onEnter(items[selectedIndex], selectedIndex);
                    } else if (isSearchFocused && items.length > 0) {
                        setSelection(0);
                        onEnter(items[0], 0);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (selectedIndex !== -1) {
                        clearSelection();
                    } else {
                        onClose();
                    }
                    break;
                default:
                    // Type search: Send characters to search box
                    // Add check to ensure event is not from input, textarea or select
                    const targetTagName = e.target.tagName.toLowerCase();
                    const isTypingInInput = ['input', 'textarea', 'select'].includes(targetTagName);

                    if (!isSearchFocused && !isTypingInInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        if (searchInput) {
                            searchInput.focus();
                            searchInput.value += e.key;
                            const inputEv = new Event('input', { bubbles: true });
                            searchInput.dispatchEvent(inputEv);
                            setTimeout(() => {
                                updateItems();
                                if (items.length > 0) setSelection(0);
                            }, 50);
                        }
                    }
                    break;
            }
        };

        // Bind
        panel.addEventListener('keydown', handleKeyDown);

        // Search linkage
        const searchInput = panel.querySelector('.quick-search, .main-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                setTimeout(() => {
                    updateItems();
                    if (items.length > 0) setSelection(0);
                    else clearSelection();
                }, 50);
            });
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    // DO NOT call handleKeyDown(e) here.
                    // The event will bubble up to the panel's listener naturally.
                    // We only prevent the default behavior (moving cursor in the input).
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (searchInput.value) {
                        searchInput.value = '';
                        const ev = new Event('input', { bubbles: true });
                        searchInput.dispatchEvent(ev);
                        setTimeout(() => {
                            updateItems();
                            if (items.length > 0) setSelection(0);
                        }, 50);
                    } else {
                        // First Esc: Only exit search box focus, do not close panel
                        searchInput.blur();
                        try { panel.focus({ preventScroll: true }); } catch (_) { panel.focus(); }
                    }
                }
            });
        }

        // Initially auto-select first item
        setTimeout(() => {
            updateItems();
            if (items.length > 0) setSelection(0);
        }, 0);

        // Call mouse interaction setup
        setupMouseInteraction();

        // Return cleaner
        return {
            getSelectedIndex: () => selectedIndex,
            setSelection,
            clearSelection,
            updateItems,
            handleKeyDown,
            getItems: () => items,
        };
    }
}
