---
description: Add Translation - Standardized i18n update process
---

# Add Translation Workflow

> **Scenario**: When adding new UI text, ensure the i18n file is updated correctly.

## 1. Determine Key Name
Follow the `module_feature_description` format.
- Example: `prompt_editor_save_success`

## 2. Update i18n.js
Add the key-value pairs in `static/js/core/i18n.js`.

```javascript
const translations = {
    'en-US': {
        // ...
        'prompt_editor_save_success': 'Prompt saved successfully',
    },
    'zh-CN': {
        // ...
        'prompt_editor_save_success': 'Prompt saved successfully',
    }
};
```

## 3. Use in Code
Use `i18n.t()` to retrieve the translation.

```javascript
import { i18n } from '../../core/i18n.js';

alert(i18n.t('prompt_editor_save_success'));
```

## 4. Verification
- Switch languages to ensure the text updates correctly.
- For dynamic content (e.g., categories), ensure dynamic retrieval logic is used.
