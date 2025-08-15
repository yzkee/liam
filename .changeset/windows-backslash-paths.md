---
"@liam-hq/cli": patch
---

- ✨ Add Windows backslash path support to CLI
    - Enable Windows users to use native backslash paths (e.g., `prisma\schema.prisma`) with the CLI tool. The implementation converts backslashes to forward slashes on Windows only, preserving the ability to use backslashes in filenames on Linux/macOS systems.