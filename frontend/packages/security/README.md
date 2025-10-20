# @liam-hq/security

Security utilities for application-layer token handling.

- Third-party tokens only: AES-256-GCM encryption with per-row IV and `key_id` for rotation. Encrypt/decrypt return `Result`.

Env variables (server-only):

- `LIAM_GITHUB_OAUTH_KEYRING` (preferred): comma-separated `kid:base64key` entries; first is current key. Used to encrypt GitHub OAuth tokens in HttpOnly cookies.
- `LIAM_KEYRING` / `KEYRING` (deprecated): legacy fallbacks with the same format. Prefer `LIAM_GITHUB_OAUTH_KEYRING`.

Exports:

- `cryptoBox`: `encryptAesGcm` (Result), `decryptAesGcm` (Result), `currentKey` (Result), `setKeyring`

See also:
- `docs/security/token-storage.md`
- `frontend/packages/security/KEY_ROTATION.md`
