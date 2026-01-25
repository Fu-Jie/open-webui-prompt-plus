# Project Development Guidelines & Rules

This document outlines the mandatory rules and standards for the **OpenWebUI Prompt Plus** project. All contributors and AI agents must adhere strictly to these guidelines.

## 1. Internationalization (I18n) - **CRITICAL**

**Rule: No Hardcoded Text.**
Every piece of user-visible text must be internationalized.

*   **Supported Languages**: You must provide translations for **ALL** of the following languages:
    *   `zh-CN` (Simplified Chinese) - **Primary**
    *   `en-US` (English)
    *   `zh-TW` (Traditional Chinese)
    *   `ko` (Korean)
    *   `fr` (French)
    *   `es` (Spanish)
    *   `nl` (Dutch)
    *   `de` (German)

*   **Implementation**:
    *   Add keys to `js/core/i18n.js`.
    *   Use `i18n.t('key_name')` in code.
    *   For dynamic updates (e.g., language switching), ensure components re-render or fetch the translation string at the moment of display.

## 2. Visual Excellence & UI/UX

**Rule: Wow the User.**
The interface must feel premium, modern, and alive.

*   **Styling Engine**: **Tailwind CSS** is the standard. Avoid custom CSS files unless absolutely necessary for complex animations.
*   **Interactivity**:
    *   **Hover States**: Interactive elements must have clear hover states (e.g., `hover:bg-gray-100`).
    *   **Micro-animations**: Use transitions for smooth state changes (e.g., `transition-all duration-200`).
    *   **Progressive Disclosure**: Hide complex actions until needed (e.g., use `group` and `group-hover` to show "Edit/Delete" buttons only when hovering over an item).
*   **Aesthetics**:
    *   Use consistent spacing (margins/padding).
    *   Support **Dark Mode** (`dark:` classes) for everything.
    *   Use modern patterns like subtle shadows, rounded corners (`rounded-xl`), and glassmorphism where appropriate.

## 3. Code Architecture & Quality

*   **File Size Limits**:
    *   Components: < 300 lines.
    *   Panels: < 500 lines.
    *   *Action*: If a file grows too large, refactor and split it immediately.
*   **Component Design**:
    *   **Single Responsibility**: One component, one job.
    *   **Safety**: Components must handle re-initialization gracefully (e.g., if the DOM is wiped and recreated).
*   **Naming**:
    *   Files: `kebab-case.js`
    *   Classes: `PascalCase`
    *   Variables: `camelCase`

## 4. Development Workflow

1.  **Modify**: Edit the code in `static/js/...`.
2.  **Verify**:
    *   Check I18n keys exist for all languages.
    *   Check Dark Mode appearance.
    *   Check Hover/Active states.
3.  **Deploy**: Run `docker compose restart open-webui-prompt-plus` to apply changes.

## 5. Git Commit Standards

*   `feat`: New features
*   `fix`: Bug fixes
*   `refactor`: Code restructuring
*   `docs`: Documentation changes
*   `style`: Formatting/UI tweaks

---
**Violation of these rules (especially I18n and Visual standards) will result in rejected code.**
