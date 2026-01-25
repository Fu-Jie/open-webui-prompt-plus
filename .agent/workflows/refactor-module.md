---
description: Refactor Large Module - Splitting large files into smaller modules
---

# Refactor Large Module Workflow

> **Scenario**: Use this process when a file's line count exceeds the standard limit (e.g., Manager > 1000 lines).

## 1. Analyze Dependencies
First, analyze the dependencies and main functional blocks of the target file.

```bash
# Check file line count
wc -l <target_file>
```

## 2. Develop a Splitting Plan
Determine the sub-modules to be extracted. For example, split `panel-manager.js` into:
- `quick-insert-panel.js`
- `management-panel.js`
- `panel-state.js`

## 3. Create New Files
Use `write_to_file` to create new module files.

```javascript
// Example: Creating a sub-module
export class SubModule {
    constructor(manager) {
        this.manager = manager;
    }
    // ... migrated methods
}
```

## 4. Migrate Code
Move the relevant logic from the main file to the new file.
- **Note**: Maintain the correctness of the `this` context.
- **Note**: Check and migrate necessary `import` statements.

## 5. Update Main File
Import and instantiate the sub-modules in the main file.

```javascript
import { SubModule } from './sub-module.js';

class MainManager {
    constructor() {
        this.subModule = new SubModule(this);
    }
    
    // Delegate calls
    someMethod() {
        return this.subModule.someMethod();
    }
}
```

## 6. Verification
Ensure the refactored code functions correctly.
- Run relevant tests (if any)
- Manually verify functionality
