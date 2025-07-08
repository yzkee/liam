---
"@liam-hq/db-structure": minor
---

🐛 Fix PostgreSQL parser foreign key resolution in chunked processing

- Fix foreign key constraint resolution when processing large schema files in chunks
- Ensure table lookup context is preserved across chunk boundaries
- Add comprehensive test coverage for chunked processing scenarios
- Improve table lookup logic in PostgreSQL converter