---
'@liam-hq/schema': minor
---

Rename package from @liam-hq/db-structure to @liam-hq/schema

This is a breaking change that renames the entire package for better clarity and consistency. The package name `@liam-hq/schema` better represents its purpose of database schema parsing and manipulation functionality.

**Breaking Changes:**
- Package name changed from `@liam-hq/db-structure` to `@liam-hq/schema`
- All import statements must be updated from `@liam-hq/db-structure` to `@liam-hq/schema`
- Directory structure changed from `frontend/packages/db-structure/` to `frontend/packages/schema/`

**Migration Guide:**
Update all import statements in your code:
```typescript
// Before
import { Schema } from '@liam-hq/db-structure'
import { parseSchema } from '@liam-hq/db-structure/parser'

// After  
import { Schema } from '@liam-hq/schema'
import { parseSchema } from '@liam-hq/schema/parser'
```

Update package.json dependencies:
```json
{
  "dependencies": {
    "@liam-hq/schema": "workspace:*"
  }
}
```

Note: This is marked as a minor version bump because the package is in v0.x where breaking changes are allowed in minor versions according to semver.
