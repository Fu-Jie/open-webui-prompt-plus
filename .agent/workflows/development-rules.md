---
description: Development Rules - Rules that must be followed for all code modifications
---

# Development Rules

## 1. Version Consistency

- When updating the version number, you MUST update it in ALL of the following files:
  - `package.json` (`version` field)
  - `loader.js` (Update `VERSION` constant in both occurrences if present)
  - `js/app.js` (Update `this.version` in constructor)
  - `README.md` (Update version badge URL)
  - `README_CN.md` (Update version badge URL)
- After updating versions, ALWAYS run `npm run build` to ensure `dist/` artifacts reflect the new version.
- Git tags should match the version number (e.g., `v0.1.5`).

## 2. Documentation

- Keep `README.md` and `README_CN.md` synchronized.
- Ensure installation instructions are accurate and reflect the latest recommended methods (e.g., Docker volume mounts).

## 3. Code Style & Safety

- Use `const` and `let`, avoid `var`.
- Ensure all async operations have proper error handling (try/catch).
- Avoid hardcoding URLs; use relative paths or dynamic detection where possible.
- **HTTPS/Mixed Content**: Ensure `loader.js` handles protocol upgrades (HTTP -> HTTPS) to support reverse proxies and Cloudflare Tunnels.

## 4. Build Process

- The `dist/` directory is tracked in Git.
- ALWAYS run `npm run build` before committing changes that affect the final bundle or static assets.
