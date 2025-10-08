---
"@liam-hq/schema": patch
---

- 🐛 Fix PostgreSQL parser to handle pg_dump meta-commands and UTF-8 byte offsets
  - Sanitize `\restrict` and `\unrestrict` meta-commands from pg_dump 16.10+ by replacing with spaces to preserve byte offsets
  - Fix UTF-8 byte offset to character index conversion for multibyte characters in chunked SQL processing
