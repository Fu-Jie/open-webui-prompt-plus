import { i18n } from './i18n.js';

// Constants and Configuration
export const CONFIG = {
    LANGUAGE: i18n.lang,
    DEBOUNCE_DELAY: 1000,
    CACHE_TTL: 30 * 60 * 1000, // 30 minutes
    BATCH_QUEUE_DELAY: 500,
    MAX_COMMAND_LENGTH: 30,
    MAX_PREVIEW_LENGTH: 50,
    NOTE_TITLE: i18n.t('note_title') || 'User Prompts',
    CACHE_VERSION: '1.1' // Cache Version
};

export const SELECTORS = {
    CHAT_INPUT: '#chat-input',
    TARGET_ELEMENTS: 'span.hidden.\\@xl\\:block.whitespace-nowrap.overflow-hidden.text-ellipsis.leading-none.pr-0\\.5',
    PLACEHOLDER_ELEMENT: 'p.is-empty.is-editor-empty',
    TARGET_CONTAINER: 'div.self-start.flex.flex-none.items-center.text-gray-600.dark\\:text-gray-400',
    NEW_TARGET_CONTAINER: 'div.flex.items-center.gap-2.self-end'
};

export const getPlaceholders = () => [
    i18n.t('placeholder_1'),
    i18n.t('placeholder_2'),
    i18n.t('placeholder_3'),
    i18n.t('placeholder_4'),
    i18n.t('placeholder_5'),
    i18n.t('placeholder_6'),
    i18n.t('placeholder_7'),
    i18n.t('placeholder_8'),
    i18n.t('placeholder_9'),
    i18n.t('placeholder_10'),
    i18n.t('placeholder_11'),
    i18n.t('placeholder_12'),
    i18n.t('placeholder_13'),
    i18n.t('placeholder_14'),
    i18n.t('placeholder_15')
];

export const INPUT_SELECTORS = [
    '#chat-input',
    'div.flex-1.flex.flex-col.relative.w-full [contenteditable="true"]',
    'div.flex-1.flex.flex-col.relative.w-full textarea',
    'div[contenteditable="true"]:not([style*="display: none"])',
    '[contenteditable="true"]:not([style*="display: none"])',
    'textarea:not([style*="display: none"])',
    'textarea[placeholder*="消息"]',
    'textarea[placeholder*="请输入"]',
    'input[type="text"]:not([style*="display: none"])',
    '[role="textbox"]:not([style*="display: none"])',
    '[data-testid*="input"]:not([style*="display: none"])'
];

// Make categories dynamic to support language switching
export const getDefaultCategories = () => [
    { id: 'writing', name: i18n.t('cat_writing'), order: 1 },
    { id: 'productivity', name: i18n.t('cat_productivity'), order: 2 },
    { id: 'learning', name: i18n.t('cat_learning'), order: 3 },
    { id: 'coding', name: i18n.t('cat_coding'), order: 4 },
    { id: 'data', name: i18n.t('cat_data'), order: 5 },
    { id: 'lifestyle', name: i18n.t('cat_lifestyle'), order: 6 },
    { id: 'roleplay', name: i18n.t('cat_roleplay'), order: 7 }
];

// Keep for backward compatibility if needed, but prefer getDefaultCategories()
export const DEFAULT_CATEGORIES = getDefaultCategories();

export const KEYBOARD_SHORTCUTS = {
    QUICK_PANEL: 'CtrlShiftP',
    MANAGEMENT_PANEL: 'CtrlShiftM',
    ESCAPE: 'Escape',
    TAB: 'Tab'
};

// Open WebUI Custom Input Variable Types and Properties
export const VARIABLE_TYPES = {
    text: {
        name: i18n.t('var_text'),
        description: i18n.t('var_text_desc'),
        properties: ['placeholder', 'default'],
        examples: [
            '{{name | text:placeholder="Enter name"}}',
            '{{title | text:default="Default Title"}}'
        ]
    },
    textarea: {
        name: i18n.t('var_textarea'),
        description: i18n.t('var_textarea_desc'),
        properties: ['placeholder', 'default'],
        examples: [
            '{{description | textarea:placeholder="Enter detailed description"}}',
            '{{content | textarea}}'
        ]
    },
    select: {
        name: i18n.t('var_select'),
        description: i18n.t('var_select_desc'),
        properties: ['options', 'default'],
        examples: [
            '{{priority | select:options=["High","Medium","Low"]}}',
            '{{category | select:options=["Tech","Business","Education"]:default="Tech"}}'
        ]
    },
    number: {
        name: i18n.t('var_number'),
        description: i18n.t('var_number_desc'),
        properties: ['placeholder', 'default', 'min', 'max', 'step'],
        examples: [
            '{{count | number:default=5}}',
            '{{score | number:min=1:max=10:default=5}}'
        ]
    },
    checkbox: {
        name: i18n.t('var_checkbox'),
        description: i18n.t('var_checkbox_desc'),
        properties: ['default'],
        examples: [
            '{{include_summary | checkbox}}',
            '{{is_urgent | checkbox:default=true}}'
        ]
    },
    date: {
        name: i18n.t('var_date'),
        description: i18n.t('var_date_desc'),
        properties: ['default'],
        examples: [
            '{{start_date | date}}',
            '{{deadline | date:default="2024-12-31"}}'
        ]
    },
    'datetime-local': {
        name: i18n.t('var_datetime_local'),
        description: i18n.t('var_datetime_local_desc'),
        properties: ['default'],
        examples: [
            '{{meeting_time | datetime-local}}',
            '{{event_start | datetime-local:default="2024-01-01T09:00"}}'
        ]
    },
    color: {
        name: i18n.t('var_color'),
        description: i18n.t('var_color_desc'),
        properties: ['default'],
        examples: [
            '{{theme_color | color}}',
            '{{brand_color | color:default="#FF5733"}}'
        ]
    },
    email: {
        name: i18n.t('var_email'),
        description: i18n.t('var_email_desc'),
        properties: ['placeholder', 'default'],
        examples: [
            '{{recipient | email:placeholder="Enter email address"}}',
            '{{contact_email | email}}'
        ]
    },
    month: {
        name: i18n.t('var_month'),
        description: i18n.t('var_month_desc'),
        properties: ['default'],
        examples: [
            '{{report_month | month}}',
            '{{billing_period | month:default="2024-01"}}'
        ]
    },
    range: {
        name: i18n.t('var_range'),
        description: i18n.t('var_range_desc'),
        properties: ['min', 'max', 'step', 'default'],
        examples: [
            '{{satisfaction | range:min=1:max=10:default=5}}',
            '{{percentage | range:min=0:max=100:step=5:default=50}}'
        ]
    },
    tel: {
        name: i18n.t('var_tel'),
        description: i18n.t('var_tel_desc'),
        properties: ['placeholder', 'default'],
        examples: [
            '{{phone | tel:placeholder="Enter phone number"}}',
            '{{contact_number | tel}}'
        ]
    },
    time: {
        name: i18n.t('var_time'),
        description: i18n.t('var_time_desc'),
        properties: ['default'],
        examples: [
            '{{start_time | time}}',
            '{{reminder_time | time:default="09:00"}}'
        ]
    },
    url: {
        name: i18n.t('var_url'),
        description: i18n.t('var_url_desc'),
        properties: ['placeholder', 'default'],
        examples: [
            '{{website | url:placeholder="Enter URL"}}',
            '{{reference_link | url}}'
        ]
    },
    map: {
        name: i18n.t('var_map'),
        description: i18n.t('var_map_desc'),
        properties: ['default'],
        examples: [
            '{{location | map}}',
            '{{meeting_place | map:default="51.5,-0.09"}}'
        ]
    }
};

// System Predefined Variables
export const SYSTEM_VARIABLES = {
    CLIPBOARD: {
        name: i18n.t('sys_clipboard'),
        description: i18n.t('sys_clipboard_desc'),
        usage: '{{CLIPBOARD}}',
        note: i18n.t('sys_clipboard_note')
    }
};

// AI Assistant Improved Prompt Generation Instructions
const AI_ASSISTANT_PROMPT_TEMPLATE = `You are a professional Open WebUI prompt generation assistant. Your core task is to intelligently generate a high-quality, versatile prompt template containing reasonable variables based on the "functional description" provided by the user.

## Generation Principles

1.  **Focus on Core Needs**: Deeply understand the user's "functional description" and accurately extract their core intent.
2.  **Design Versatile Templates**: The generated prompt content should be refined and versatile, applicable to various similar scenarios.
3.  **Intelligent Variable Usage**:
    *   Automatically identify and set reasonable variables to increase template flexibility.
    *   **Variable Names**: Should be concise and descriptive. For **{{INTERFACE_LANGUAGE}}** prompts, you MAY use localized variable names (e.g., Chinese variable names for Chinese prompts) so they appear as friendly labels in the UI.
    *   **Variable UI Text**: Any user-facing text within variable definitions (such as \`placeholder\`, \`options\` for select types, or text-based \`default\` values) **MUST** be in **{{INTERFACE_LANGUAGE}}**.
    *   **Prohibition**: Do NOT use variables or placeholders (like \`{{...}}\`) inside property values (e.g., \`placeholder\`, \`default\`). The value must be a static string.
        *   ✅ Correct: \`{{code | textarea:placeholder="Paste your code here"}}\`
        *   ❌ Incorrect: \`{{code | textarea:placeholder="{{INTERFACE_LANGUAGE}}Paste your code here"}}\`
    *   Set appropriate types and default values for variables.
4.  **Clear Structure**: Use Markdown to format the prompt content, making it structured and easy to read.
5.  **Precise Classification**: You must select the most appropriate category for the prompt from the "Available Category List" below and return its **ID** in the \`category\` field of the JSON output.
6.  **Command Name Standard**:
    *   The \`command\` field must be in **English**, using hyphens or underscores as separators (e.g., \`weekly-report\`, \`code_reviewer\`).
    *   The command name should be closely related to the prompt function.
7.  **Language Consistency**:
    *   **CRITICAL**: If the user does not explicitly specify a language, you MUST generate the prompt title (\`title\`), content (\`content\`), and all variable UI text (placeholders, options) in **{{INTERFACE_LANGUAGE}}**.

## Output Format

Please strictly return the result in the following JSON format, without adding any extra explanation or description.
**IMPORTANT**: Ensure the output is valid JSON. For multi-line strings (like \`content\`), use \`\\n\` for line breaks. Do NOT use actual line breaks inside the JSON string values.

\`\`\`json
{
  "title": "Concise and clear title",
  "content": "Prompt content carefully designed using Markdown and English variables...\\n\\nUse escaped newlines for multi-line content.",
  "category": "Category ID selected from the available category list",
  "command": "english-command-name"
}
\`\`\`

Please immediately start analyzing the user's needs and generating the prompt.`;

export const getAIAssistantPrompt = () => AI_ASSISTANT_PROMPT_TEMPLATE;
export const AI_ASSISTANT_PROMPT = AI_ASSISTANT_PROMPT_TEMPLATE;
