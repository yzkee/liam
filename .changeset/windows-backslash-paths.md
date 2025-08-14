---
"@liam-hq/cli": patch
---

Add Windows backslash path support to CLI

Enable Windows users to use native backslash paths (e.g., `prisma\schema.prisma`) with the CLI tool. The implementation converts backslashes to forward slashes on Windows only, preserving the ability to use backslashes in filenames on Linux/macOS systems.

- Windows: Both `path\to\file` and `path/to/file` now work correctly
- Linux/macOS: Backslashes are preserved as part of filenames
- No breaking changes for existing users