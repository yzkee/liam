// Server-only GitHub token utilities: read access token from Cookie (no refresh in RSC)

import { ResultAsync } from '@liam-hq/neverthrow'
import { readAccessToken } from './cookie'

const SAFETY_MS = 3 * 60 * 1000 // 3 minutes safety window
// No schema/refresh handling here; handled in Route Handler

function isExpiringSoon(expiresAtIso: string | null | undefined): boolean {
  if (!expiresAtIso) return true
  const expiresAt = new Date(expiresAtIso).getTime()
  return Date.now() + SAFETY_MS >= expiresAt
}

// No refresh here; Route Handler performs refresh and cookie writes

export function getUserAccessToken(
  _userId: string,
): ResultAsync<string | null, Error> {
  return ResultAsync.fromPromise(readAccessToken(), (e) =>
    e instanceof Error ? e : new Error(String(e)),
  ).map((access) => {
    if (access && !isExpiringSoon(access.expiresAt)) {
      return access.token
    }
    // Do not refresh here; return null so callers decide how to refresh.
    return null
  })
}
