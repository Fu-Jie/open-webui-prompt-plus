---
description: Development Rules - Rules that must be followed for all code modifications
---

# Prompt Enhancement System Development Rules

> **Scope**: All modifications to code under the `static/` directory.

---

## 1. File Size Limits (Mandatory)

| Type | Recommended Lines | Hard Limit |
|------|-------------------|------------|
| Components (`components/`) | < 200 lines | 300 lines |
| Panels (`panels/`) | < 300 lines | 500 lines |
| Core Modules (`core/`) | < 500 lines | 800 lines |
| Managers (`*-manager.js`) | < 800 lines | 1000 lines |
| CSS Files | < 1500 lines | 2000 lines |

**When a modification causes a file to exceed the limit, a splitting plan must be discussed first.**

---

## 2. Internationalization (i18n) Standards (Mandatory)

1. **No Hardcoded User-Visible Text**: All user-visible text must use `i18n.t('key')`.
2. **Multi-Language Support**: Ensure keys are added to ALL supported languages (`zh-CN`, `en-US`, `zh-TW`, `ko`, `fr`, `es`, `nl`, `de`).
3. **Dynamic Translation**: For content that needs to take effect immediately after a language switch, use functions to return translations or re-render logic.
4. **Key Naming**: `module_feature_description` (e.g., `prompt_editor_title`).

```javascript
// ❌ Prohibited
{ name: 'Creative Writing' }

// ✅ Correct
{ name: i18n.t('cat_writing') }
```

---

## 3. Naming Conventions

- **Files**: `kebab-case.js`
- **Classes**: `PascalCase`
- **Variables/Functions**: `camelCase`
- **CSS Classes**: Tailwind utility classes preferred; BEM Variant (`.block__element--modifier`) for custom CSS.

---

## 4. Component Design Principles

1. **Single Responsibility**: Each component should do only one thing.
2. **Dependency Injection**: Pass dependencies via the constructor configuration object.
3. **Callback Interface**: Use a `callbacks` object to pass event handling functions.
4. **Re-initialization Safe**: Components must handle DOM re-renders gracefully (e.g., check if container exists before initialization).

---

## 5. Visual Excellence & UX (Mandatory)

1. **Rich Aesthetics**: Use modern web design practices (glassmorphism, vibrant colors, dark mode support).
2. **Dynamic Interactions**:
    - **Hover Effects**: Use `group` and `group-hover` for revealing actions (e.g., show "Edit" button only on hover).
    - **Micro-animations**: Add subtle transitions (`transition-all duration-200`) to interactive elements.
3. **Unified Layout**: Ensure consistent spacing and alignment across similar components (e.g., using Flexbox/Grid consistently).
4. **Tailwind First**: Use Tailwind CSS for styling unless complex custom animations are required.

---

## 6. Code Refactoring Principles

Follow the "Simple to Complex" principle:
1. Extract independent, low-coupled parts first (utility functions, UI components).
2. Then handle core logic (business logic, event handling).
3. Verify normal functionality after each refactoring.

---

## 7. Development Workflow

1. **Plan**: Understand requirements and outline features.
2. **Build Foundation**: Update `index.css` or core utilities if needed.
3. **Create Components**: Build focused, reusable components with `i18n` and Tailwind.
4. **Assemble**: Integrate components into Panels (`panel-manager.js`).
5. **Polish**: Review UX, add animations, and optimize performance.
6. **Test**: Run `docker compose restart open-webui-prompt-plus` to validate changes in the containerized environment.

---

## 8. Git Commit Standards

Format: `<type>(<scope>): <subject>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Refactoring
- `style`: Style adjustment
- `docs`: Documentation update

---

## 9. Code Review Checklist

Check before modifying code:
- [ ] Does it cause the file to exceed the line limit?
- [ ] Is `i18n` used for ALL text?
- [ ] Does the UI look premium and interactive (hover states, transitions)?
- [ ] Are dependencies injected correctly?
- [ ] Did you restart the container to verify?
