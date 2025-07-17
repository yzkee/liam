# Changeset Creation Guide

## When to Create a Changeset

### 1. Identify Affected Packages

Determine which packages are affected by your changes.

### 2. Changeset Required When

All of the following conditions must be met:

1. **Target packages** (not in ignore list):
   - `@liam-hq/cli`
   - `@liam-hq/erd-core`
   - `@liam-hq/db-structure`
   - `@liam-hq/ui`

2. **User-facing changes**:
   - New features
   - Bug fixes
   - API changes
   - Performance improvements
   - Behavioral changes

### 3. Changeset Not Required

- **Ignored packages**:
  ```
  @liam-hq/agent, @liam-hq/app, @liam-hq/docs,
  @liam-hq/figma-to-css-variables, @liam-hq/db,
  @liam-hq/jobs, @liam-hq/storybook, @liam-hq/github,
  @liam-hq/schema-bench
  ```

- **Non-user-facing changes**:
  - Internal refactoring (no external API changes)
  - Test additions/modifications only
  - Development tooling changes
  - Comments or documentation only
  - Internal type definition improvements

## How to Create a Changeset

### 1. Determine Version Type

- **major**: Breaking changes
- **minor**: New features (backward compatible)
- **patch**: Bug fixes, small improvements

### 2. Create Changeset File

```
.changeset/[descriptive-change-name].md
```

### 3. Format

```markdown
---
"@liam-hq/package-name": version-type(minor|patch)
---

- [emoji] Brief description
  - Specific change details
  - Technical details (if necessary)
```

## Examples

### New Feature (minor)
```markdown
---
"@liam-hq/db-structure": minor
---

- ✨ Add support for Rails inline index syntax in schema.rb parser
  - Support inline index declarations: `t.string "name", index: true`
  - Handle unique indexes: `t.text "mention", index: { unique: true }`
  - Parse custom index names: `t.string "slug", index: { name: "custom_name" }`
  - Support index types: `t.string "email", index: { using: "gin" }`
```

### Bug Fix (patch)
```markdown
---
"@liam-hq/erd-core": patch
---

- 🐛 Fix table position not persisting after page reload
  - Store table positions in local storage
  - Restore positions when ERD is re-rendered
```

### Breaking Change (major)
```markdown
---
"@liam-hq/cli": major
---

- 💥 Rename output format option for consistency
  - BREAKING: Change `--format` to `--output-format`
  - BREAKING: Remove deprecated `--type` option
  - Add migration guide in documentation
```

## Emoji Guide

- ✨ New feature
- 🐛 Bug fix
- 💥 Breaking change
- ⚡ Performance improvement
- ♻️ Code improvement
- 🔧 Configuration/options

## Decision Examples

### Changeset Required
- ✅ Adding new syntax support to parser
- ✅ Fixing user-facing bugs
- ✅ Adding new CLI options
- ✅ Fixing UI component display issues

### Changeset Not Required
- ❌ Adding test cases only
- ❌ Internal refactoring (no API changes)
- ❌ TypeScript type improvements only
- ❌ Development environment config changes