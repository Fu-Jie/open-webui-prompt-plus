import { i18n } from '../../core/i18n.js';

/**
 * DomUtils - DOM Manipulation Utility Class
 * Handles DOM-related functions like root container management, overlay creation, etc.
 */
export class DomUtils {
    constructor(rootContainerId = 'prompt-enhancement-system') {
        this.rootContainerId = rootContainerId;
        this.rootContainer = null;
    }

    /**
     * Ensure root container exists
     * @returns {HTMLElement} Root container element
     */
    ensureRootContainer() {
        if (this.rootContainer && document.body.contains(this.rootContainer)) {
            return this.rootContainer;
        }

        this.rootContainer = document.createElement('div');
        this.rootContainer.id = this.rootContainerId;
        document.body.appendChild(this.rootContainer);

        return this.rootContainer;
    }

    /**
     * Create overlay
     * @param {string} type - Overlay type ('quick' or 'management')
     * @returns {HTMLElement} Overlay element
     */
    createOverlay(type = 'quick') {
        this.ensureRootContainer();

        let overlay = document.getElementById('panel-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'panel-overlay';
            overlay.className = 'panel-overlay';
            this.rootContainer.appendChild(overlay);
        }

        // Set different styles based on type
        overlay.className = type === 'management' ? 'panel-overlay management' : 'panel-overlay';
        overlay.style.display = 'block';
        overlay.style.zIndex = '100000';

        // Intercept wheel/touch scroll on overlay
        const stop = (e) => e.preventDefault();
        overlay.addEventListener('wheel', stop, { passive: false });
        overlay.addEventListener('touchmove', stop, { passive: false });

        return overlay;
    }

    /**
     * Remove overlay
     */
    removeOverlay() {
        const overlay = document.getElementById('panel-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Get root container
     * @returns {HTMLElement|null} Root container element
     */
    getRootContainer() {
        return this.rootContainer;
    }

    /**
     * Show a custom alert modal
     * @param {string} message - Alert message
     * @param {string} title - Alert title (optional)
     * @returns {Promise<void>} Resolves when closed
     */
    showAlert(message, title = null) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center';
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    e.stopPropagation();
                }
            };

            const isDark = document.documentElement.classList.contains('dark');
            const bg = isDark ? '#171717' : '#fff';
            const text = isDark ? '#e5e7eb' : '#4b5563';

            const dialog = document.createElement('div');
            dialog.className = 'prompt-modal-content modal-sm';
            dialog.style.cssText = `
                width: 400px; 
                max-width: 90vw; 
                background: ${bg}; 
                border-radius: 12px; 
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); 
                display: flex; 
                flex-direction: column; 
                overflow: hidden;
                margin: 0 16px;
                transform: scale(1);
                transition: transform 0.2s;
            `;

            const displayTitle = title || i18n.t('info') || 'Info';

            dialog.innerHTML = `
                <!-- Purple-blue gradient header -->
                <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; flex-shrink: 0;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0; color: #fff;">${displayTitle}</h3>
                    <button type="button" class="btn-close" style="width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; border: none; border-radius: 6px; background: rgba(255, 255, 255, 0.2); color: #fff; cursor: pointer; font-size: 18px; transition: background 0.2s;">×</button>
                </div>
                
                <!-- Content -->
                <div style="padding: 24px 20px;">
                    <p class="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap" style="margin: 0; font-size: 14px; line-height: 1.5; color: ${text};">${message}</p>
                </div>

                <!-- Actions -->
                <div class="form-actions" style="display: flex; justify-content: flex-end; padding: 0 20px 20px 20px;">
                    <button class="btn-confirm" style="padding: 8px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">${i18n.t('confirm') || 'OK'}</button>
                </div>
            `;

            const container = document.body;

            const close = () => {
                container.removeChild(overlay);
            };

            // Close button in header
            dialog.querySelector('.btn-close').onclick = (e) => {
                e.stopPropagation();
                close();
                resolve();
            };

            dialog.querySelector('.btn-confirm').onclick = (e) => {
                e.stopPropagation();
                close();
                resolve();
            };

            overlay.style.zIndex = '2147483647';
            overlay.appendChild(dialog);
            container.appendChild(overlay);
        });
    }

    /**
     * Show a custom confirm modal
     * @param {string} message - Confirm message
     * @param {string} title - Confirm title (optional)
     * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise
     */
    showConfirm(message, title = null) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'pes-confirm-overlay fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center';
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    e.stopPropagation();
                }
            };

            const isDark = document.documentElement.classList.contains('dark');
            const bg = isDark ? '#171717' : '#fff';
            const text = isDark ? '#e5e7eb' : '#4b5563';
            const btnCancelBg = isDark ? '#374151' : '#f3f4f6';
            const btnCancelText = isDark ? '#e5e7eb' : '#374151';
            const btnCancelBorder = isDark ? '#4b5563' : '#d1d5db';

            const dialog = document.createElement('div');
            dialog.className = 'prompt-modal-content modal-sm';
            dialog.style.cssText = `
                width: 400px; 
                max-width: 90vw; 
                background: ${bg}; 
                border-radius: 12px; 
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); 
                display: flex; 
                flex-direction: column; 
                overflow: hidden;
                margin: 0 16px;
                transform: scale(1);
                transition: transform 0.2s;
            `;

            const displayTitle = title || i18n.t('confirm_delete_title') || 'Confirm';

            dialog.innerHTML = `
                <!-- Purple-blue gradient header -->
                <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; flex-shrink: 0;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0; color: #fff;">${displayTitle}</h3>
                    <button type="button" class="btn-close" style="width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; border: none; border-radius: 6px; background: rgba(255, 255, 255, 0.2); color: #fff; cursor: pointer; font-size: 18px; transition: background 0.2s;">×</button>
                </div>
                
                <!-- Content -->
                <div style="padding: 24px 20px;">
                    <p class="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap" style="margin: 0; font-size: 14px; line-height: 1.5; color: ${text};">${message}</p>
                </div>

                <!-- Actions -->
                <div class="form-actions" style="display: flex; gap: 10px; padding: 0 20px 20px 20px;">
                    <button class="btn-cancel" style="flex: 1; padding: 10px 16px; background: ${btnCancelBg}; color: ${btnCancelText}; border: 1px solid ${btnCancelBorder}; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">${i18n.t('cancel') || 'Cancel'}</button>
                    <button class="btn-confirm" style="flex: 1; padding: 10px 16px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">${i18n.t('delete') || 'Delete'}</button>
                </div>
            `;

            const container = document.body;

            const close = () => {
                container.removeChild(overlay);
            };

            // Close button in header
            dialog.querySelector('.btn-close').onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
                resolve(false);
            };

            dialog.querySelector('.btn-cancel').onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
                resolve(false);
            };

            dialog.querySelector('.btn-confirm').onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Delay closing slightly to ensure event handling is complete
                setTimeout(() => {
                    close();
                    resolve(true);
                }, 50);
            };

            overlay.style.zIndex = '2147483647';
            overlay.appendChild(dialog);
            container.appendChild(overlay);
        });
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type ('success', 'error', 'info')
     */
    showToast(message, type = 'success') {
        // Redirect to modal message as per user request
        this.showModalMessage(message, type);
    }

    showModalMessage(message, type) {
        // Remove existing modals
        const existing = document.querySelectorAll('.pes-modal-overlay');
        existing.forEach(el => el.remove());

        const overlay = document.createElement('div');
        overlay.className = 'pes-modal-overlay';

        const box = document.createElement('div');
        box.className = 'pes-modal-box';

        // Clean message
        const cleanMessage = message.replace(/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '');

        // Title based on type
        let title = i18n.t('info');
        if (type === 'error') title = i18n.t('error');
        if (type === 'info') title = i18n.t('info');

        box.innerHTML = `
            <div class="pes-modal-header">
                <div class="pes-modal-title">${title}</div>
                <button class="pes-modal-close">✕</button>
            </div>
            <div class="pes-modal-body">
                ${cleanMessage}
            </div>
            <div class="pes-modal-footer">
                <button class="pes-modal-btn">${i18n.t('confirm')}</button>
            </div>
        `;

        const close = () => {
            overlay.style.transition = 'opacity 0.2s ease-out';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        };

        box.querySelector('.pes-modal-close').onclick = close;
        box.querySelector('.pes-modal-btn').onclick = close;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Focus confirm button
        setTimeout(() => {
            const btn = box.querySelector('.pes-modal-btn');
            if (btn) btn.focus();
        }, 100);
    }
}
