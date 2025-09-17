---
"@liam-hq/agent": patch
---

Add retry functionality with exponential backoff to SupabaseCheckpointSaver to handle transient network failures like "TypeError: fetch failed"
