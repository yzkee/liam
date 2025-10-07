---
"@liam-hq/schema": minor
"@liam-hq/cli": patch
---

- Add support for Liam Schema format JSON files in ERD page parser
- Liam format requires no conversion - just JSON parsing and validation against schemaSchema
- Users can specify format using `?format=liam` query parameter
