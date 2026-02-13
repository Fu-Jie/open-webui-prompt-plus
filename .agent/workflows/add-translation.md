---
description: Add Translation - Standardized i18n update process
---

# Add Translation Workflow

This workflow helps you add new translation keys or update existing ones across all supported languages in `js/core/i18n.js`.

## Steps

1. **Read the i18n File**:
    - Read `js/core/i18n.js` to understand the current structure and existing keys.

2. **Identify Changes**:
    - Determine which new keys need to be added or which existing keys need to be updated.
    - The base language is **English (`en`)**.

3. **Generate Translations**:
    - For each new key in English, generate translations for all other supported languages:
        - `zh-CN` (Simplified Chinese)
        - `zh-TW` (Traditional Chinese)
        - `ja` (Japanese)
        - `ko` (Korean)
        - `fr` (French)
        - `de` (German)
        - `es` (Spanish)
        - `nl` (Dutch)
        - `el` (Greek)
    - Ensure translations are contextually appropriate for a UI/AI tool.

4. **Update File**:
    - Use `replace_file_content` (or `multi_replace_file_content` if changes are scattered) to update `js/core/i18n.js`.
    - **Crucial**: Maintain the JSON structure validity inside the JS object.

5. **Verify**:
    - Check if any syntax errors were introduced.
