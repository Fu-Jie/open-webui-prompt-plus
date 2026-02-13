export class Header {
    constructor(title, buttonsConfig) {
        this.title = title;
        this.buttonsConfig = buttonsConfig;
        this.element = this._render();
    }

    _render() {
        const header = document.createElement('div');
        // REFACTOR: Use Tailwind classes directly, remove custom class dependency.
        header.className = 'flex items-center justify-between px-2.5 py-1.5 flex-shrink-0';

        const titleEl = document.createElement('h2');
        titleEl.className = 'text-sm font-semibold'; // REFACTOR: Style with Tailwind
        titleEl.textContent = this.title;
        header.appendChild(titleEl);

        const actions = document.createElement('div');
        actions.className = 'header-actions flex items-center gap-2';

        this.buttonsConfig.forEach(btn => {
            const button = document.createElement('button');
            button.type = 'button';
            // Use a more generic class and add modifiers
            // Use transparent background by default, only show background on hover
            button.className = `btn-header inline-flex items-center gap-1 text-sm rounded-md px-2.5 py-1.5 border border-transparent hover:bg-white/10 ${btn.className || ''}`;
            button.title = btn.title;
            if (btn.id) button.id = btn.id;
            if (btn.action) button.dataset.action = btn.action;

            // Structure for icon + text
            let content = `<span class="btn-icon">${btn.icon}</span>`;
            if (btn.text) {
                content += `<span class="btn-text">${btn.text}</span>`;
            }
            button.innerHTML = content;

            if (btn.style) button.style.cssText = btn.style;
            actions.appendChild(button);
        });

        header.appendChild(actions);
        return header;
    }
}
