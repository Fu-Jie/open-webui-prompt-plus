import { i18n } from '../../core/i18n.js';

export class Pagination {
    constructor(container, callbacks = {}) {
        this.container = container;
        this.callbacks = callbacks; // { onPageChange: (direction) => {} }
    }

    render(currentPage, totalPages) {
        // Clear any existing pager in the container
        const existingPager = this.container.querySelector('.panel-pager');
        if (existingPager) {
            existingPager.remove();
        }

        const pager = document.createElement('div');
        pager.className = 'panel-pager flex items-center justify-center p-2 text-xs gap-4';
        // Inline fallback styles
        pager.style.display = 'flex';
        pager.style.alignItems = 'center';
        pager.style.justifyContent = 'center';
        pager.style.padding = '8px 12px';

        // Ensure container is visible
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.marginTop = 'auto';
        this.container.style.flexShrink = '0';

        if (totalPages > 1) {
            const isFirstPage = currentPage === 1;
            const isLastPage = currentPage === totalPages;

            pager.innerHTML = `
                <button class="px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" ${isFirstPage ? 'disabled' : ''}>
                    < ${i18n.t('prev_page')}
                </button>
                <span>${i18n.t('page_info').replace('{current}', currentPage).replace('{total}', totalPages)}</span>
                <button class="px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" ${isLastPage ? 'disabled' : ''}>
                    ${i18n.t('next_page')} >
                </button>
            `;
            this._bindEvents(pager);
        } else {
            // Single page or empty
            if (totalPages === 1) {
                pager.innerHTML = `
                    <button class="px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        < ${i18n.t('prev_page')}
                    </button>
                    <span>${i18n.t('page_info').replace('{current}', 1).replace('{total}', 1)}</span>
                    <button class="px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        ${i18n.t('next_page')} >
                    </button>
                `;
            } else {
                pager.style.display = 'none';
            }
        }

        this.container.appendChild(pager);
    }

    _bindEvents(pager) {
        const buttons = pager.querySelectorAll('button');
        if (buttons.length !== 2) return;

        const prevBtn = buttons[0];
        const nextBtn = buttons[1];

        if (!prevBtn.disabled) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.callbacks.onPageChange) this.callbacks.onPageChange('prev');
            };
        }

        if (!nextBtn.disabled) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.callbacks.onPageChange) this.callbacks.onPageChange('next');
            };
        }
    }
}
