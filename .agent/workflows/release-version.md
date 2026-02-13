---
description: Release Version - Standardized version bump and release process
---

# Release Version Workflow

This workflow automates the process of bumping the version number, building the project, and preparing git commits/tags for a new release.

## Steps

1. **Determine New Version**:
    - Ask the user for the new version number (e.g., `0.1.6`).

2. **Update Version Numbers**:
    - Update `package.json`: `version` field.
    - Update `loader.js`: `VERSION` constant (check for multiple occurrences).
    - Update `js/app.js`: `this.version` in the constructor.
    - Update `README.md`: Version badge URL.
    - Update `README_CN.md`: Version badge URL.

3. **Build Project**:
    - Run `npm run build` to update the `dist/` directory with the new version code.
    // turbo
    - Command: `npm run build`

4. **Git Commit & Tag**:
    - Stage all changes: `git add .`
    - Commit with message: `chore: bump version to v<NEW_VERSION>`
    - Create tag: `git tag v<NEW_VERSION>`
    - Push commit and tag: `git push && git push origin v<NEW_VERSION>`

5. **Verification**:
    - Confirm that the build was successful and the tag was pushed.
