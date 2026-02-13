/**
 * ScrollUtils - Scroll Management Utility Class
 * Handles background scroll locking, wheel event routing, etc.
 */
export class ScrollUtils {
    constructor() {
        this.scrollLocked = false;
        this.scrollLock = null;
        this.trapInstalled = false;
        this.trapTouchMove = null;
        this.trapKeydown = null;
    }

    /**
     * Lock background scroll
     */
    lockBackgroundScroll() {
        if (this.scrollLocked) return;
        this.scrollLocked = true;

        const x = window.scrollX || window.pageXOffset || 0;
        const y = window.scrollY || window.pageYOffset || 0;
        this.scrollLock = { x, y };

        // Disable background scroll and fix page position
        document.documentElement.classList.add('pes-no-scroll');
        document.body.classList.add('pes-no-scroll');

        // Further hard lock (iOS/Safari/Touchpad)
        document.documentElement.style.overscrollBehaviorY = 'none';
        document.body.style.overscrollBehaviorY = 'none';

        // Fix body to prevent any page-level displacement
        document.body.style.position = 'fixed';
        document.body.style.top = `-${y}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';

        // Install global scroll trap
        this.installGlobalScrollTrap();
    }

    /**
     * Unlock background scroll
     */
    unlockBackgroundScroll() {
        if (!this.scrollLocked) return;

        document.documentElement.classList.remove('pes-no-scroll');
        document.body.classList.remove('pes-no-scroll');

        document.documentElement.style.overscrollBehaviorY = '';
        document.body.style.overscrollBehaviorY = '';

        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';

        const pos = this.scrollLock || { x: 0, y: 0 };
        window.scrollTo(pos.x, pos.y);

        // Remove global scroll trap
        this.removeGlobalScrollTrap();

        this.scrollLocked = false;
        this.scrollLock = null;
    }

    /**
     * Attach wheel scroll lock to element
     * @param {HTMLElement} el - Target element
     */
    attachWheelScrollLock(el) {
        if (!el || el.dataset.wheelLock === 'true') return;

        // Use modern CSS property to prevent scroll chaining
        el.style.overscrollBehavior = 'contain';

        // Mark as locked
        el.dataset.wheelLock = 'true';
    }

    /**
     * Attach wheel routing to panel
     * @param {HTMLElement} panelEl - Panel element
     * @param {HTMLElement} listEl - List element
     */
    attachPanelWheelRouting(panelEl, listEl) {
        if (!panelEl || panelEl.dataset.wheelRouted === 'true') return;

        panelEl.addEventListener('wheel', (e) => {
            if (!listEl) return;
            // Route to list when wheel event occurs in panel empty area
            if (!listEl.contains(e.target)) {
                e.preventDefault();
                listEl.scrollTop += e.deltaY;
            }
        }, { passive: false });

        panelEl.dataset.wheelRouted = 'true';
    }

    /**
     * Install global scroll trap
     * @param {string} rootContainerId - Root container ID
     */
    installGlobalScrollTrap(rootContainerId = 'prompt-enhancement-system') {
        if (this.trapInstalled) return;
        this.trapInstalled = true;

        const root = () => document.getElementById(rootContainerId);

        // Note: wheel event trapping removed - CSS (body position: fixed) already locks background scroll.
        // Manual wheel interception was causing scroll issues inside the panel.

        this.trapTouchMove = (e) => {
            const r = root();
            if (!r) return;
            if (!r.contains(e.target)) {
                e.preventDefault();
            }
        };

        this.trapKeydown = (e) => {
            // Allow typing in input elements
            const tagName = e.target.tagName;
            if (tagName === 'TEXTAREA' || tagName === 'INPUT' || tagName === 'SELECT' || e.target.isContentEditable) {
                return;
            }

            const keys = [' ', 'Space', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (!keys.includes(e.key)) return;
            const r = root();
            if (!r) return;
            if (!r.contains(e.target)) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchmove', this.trapTouchMove, { passive: false, capture: true });
        document.addEventListener('keydown', this.trapKeydown, { capture: true });
    }

    /**
     * Remove global scroll trap
     */
    removeGlobalScrollTrap() {
        if (!this.trapInstalled) return;

        document.removeEventListener('touchmove', this.trapTouchMove, { capture: true });
        document.removeEventListener('keydown', this.trapKeydown, { capture: true });

        this.trapInstalled = false;
        this.trapTouchMove = null;
        this.trapKeydown = null;
    }
}
