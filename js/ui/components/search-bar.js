export class SearchBar {
    constructor(config) {
        this.config = config;
        this.element = this._render();
    }

    _render() {
        // REFACTOR: Consolidate all styling into Tailwind classes, removing dependency on custom CSS.
        const searchContainer = document.createElement('div');
        searchContainer.className = `px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 relative z-10 ${this.config.containerClass || ''}`;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = this.config.placeholder;
        // The existing classes are already comprehensive. We just need to ensure the custom inputClass is passed correctly.
        input.className = `w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${this.config.inputClass || ''}`;
        input.oninput = this.config.oninput;
        searchContainer.appendChild(input);

        if (this.config.button) {
            const button = document.createElement('button');
            button.className = `${this.config.button.className} btn-secondary inline-flex items-center gap-1 rounded-md px-3 py-1.5 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800`;
            button.dataset.action = this.config.button.action;
            button.textContent = this.config.button.text;
            searchContainer.appendChild(button);
        }

        return searchContainer;
    }
}
