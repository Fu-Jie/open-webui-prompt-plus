---
description: Create New Component - Standardized component creation process
---

# Create New Component Workflow

> **Scenario**: When creating a new UI component, ensure naming, structure, and design standards are followed.

## 1. Determine Component Name and Location
- **Name**: Use `kebab-case` (e.g., `user-profile-card`).
- **Location**: Typically under `static/js/ui/components/`.

## 2. Create Component File
Use `write_to_file` to create the file.

```javascript
import { i18n } from '../../core/i18n.js';

export class UserProfileCard {
    /**
     * @param {Object} config
     * @param {Object} config.user - User data
     * @param {Object} config.callbacks - Callback functions
     */
    constructor(config) {
        this.config = config;
        this.element = document.createElement('div');
        this._init();
    }

    _init() {
        // Use Tailwind for styling: rounded corners, shadow, padding, hover effects
        this.element.className = 'user-profile-card group p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700';
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${this.config.user.name}</h3>
                <!-- Action button visible on hover -->
                <button class="btn-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1 rounded-lg bg-blue-500 text-white text-sm">
                    ${i18n.t('edit_profile')}
                </button>
            </div>
        `;
        
        // Bind events
        const btn = this.element.querySelector('button');
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                if (this.config.callbacks.onEdit) {
                    this.config.callbacks.onEdit();
                }
            };
        }
    }
}
```

## 3. Compliance Checklist
- [ ] Is the class name `PascalCase`?
- [ ] Is `i18n.t()` used for all text?
- [ ] Are dependencies injected via `config`?
- [ ] Are Tailwind class names used for styling?
- [ ] Does it include hover effects or transitions (`group`, `transition-all`)?
- [ ] Is it responsive (e.g., `dark:` classes)?

## 4. Export Component
Ensure the class is correctly exported at the end of the file.
