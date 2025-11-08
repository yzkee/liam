---
"@liam-hq/erd-core": patch
---

- ✨ Add Export dropdown to copy PostgreSQL DDL and YAML from the ERD
  - Adds ExportDropdown to the AppBar with “Copy PostgreSQL” and “Copy YAML” actions, using schema deparsers and clipboard with success/error toasts; adds @liam-hq/neverthrow dependency
