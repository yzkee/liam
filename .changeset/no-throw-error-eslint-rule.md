---
"@liam-hq/configs": patch
---

feat: add custom ESLint rule to prohibit throw new Error and enforce neverthrow usage

- Create no-throw-error-plugin.js with rule that detects ThrowStatement nodes with new Error pattern
- Integrate plugin into base ESLint configuration for all packages
- Apply bulk suppressions to existing violations using eslint --suppress-rule
- Rule recommends neverthrow Result types (err, ok, ResultAsync) in error messages
