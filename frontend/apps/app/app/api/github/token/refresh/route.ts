import {
  fromPromise,
  fromValibotSafeParse,
  type Result,
} from '@liam-hq/neverthrow'
import { OAuthApp } from '@octokit/oauth-app'
import * as Sentry from '@sentry/nextjs'
import type { ResultAsync as NeverthrowResultAsync } from 'neverthrow'
import { err, ok, ResultAsync } from 'neverthrow'
import { NextResponse } from 'next/server'
import * as v from 'valibot'
import type { TokenPayload } from '../../../../../libs/github/cookie'
import {
  readRefreshToken,
  writeAccessToken,
  writeRefreshToken,
} from '../../../../../libs/github/cookie'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const getClientCredentials = (): Result<
  { clientId: string; clientSecret: string },
  Error
> => {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return err(new Error('Missing GitHub OAuth client credentials'))
  }
  return ok({ clientId, clientSecret })
}

type RefreshAccessTokenResult = {
  accessToken: string
  refreshToken: string
  refreshTokenExpiresIn: number | null
  newExpiresAt: string
}

// Minimal schema for Octokit OAuthApp refresh response
const OctokitOAuthRefreshSchema = v.object({
  authentication: v.object({
    token: v.string(),
    refreshToken: v.string(),
    expiresAt: v.string(),
    refreshTokenExpiresAt: v.optional(v.string()),
  }),
})

function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): ResultAsync<RefreshAccessTokenResult, Error> {
  const app = new OAuthApp({ clientId, clientSecret })
  return ResultAsync.fromPromise(app.refreshToken({ refreshToken }), (e) =>
    e instanceof Error ? e : new Error(String(e)),
  )
    .andThen((res) => fromValibotSafeParse(OctokitOAuthRefreshSchema, res))
    .map(({ authentication }) => {
      const expiresAt = new Date(authentication.expiresAt)
      const refreshTokenExpiresAt = authentication.refreshTokenExpiresAt
        ? new Date(authentication.refreshTokenExpiresAt)
        : null

      const refreshTokenExpiresIn = refreshTokenExpiresAt
        ? Math.max(
            0,
            Math.floor((refreshTokenExpiresAt.getTime() - Date.now()) / 1000),
          )
        : null

      return {
        accessToken: authentication.token,
        refreshToken: authentication.refreshToken,
        refreshTokenExpiresIn,
        newExpiresAt: expiresAt.toISOString(),
      }
    })
}

async function handler(): Promise<NextResponse> {
  // 1) Load client credentials
  const creds = getClientCredentials()
  if (creds.isErr()) {
    Sentry.captureException(creds.error, { tags: { area: 'refresh_api' } })
    return NextResponse.json(
      { ok: false, error: 'server_misconfigured' },
      { status: 500 },
    )
  }
  const { clientId, clientSecret } = creds.value

  // 2) Read refresh token and refresh via GitHub
  const refreshTokenResult: NeverthrowResultAsync<TokenPayload, Error> =
    readRefreshToken()
  const result = await refreshTokenResult
    .andThen(({ token }: TokenPayload) =>
      refreshAccessToken(token, clientId, clientSecret),
    )
    .andThen((refreshed: RefreshAccessTokenResult) => {
      const rtei = refreshed.refreshTokenExpiresIn ?? 0
      const refreshTtlMs = rtei > 0 ? rtei * 1000 : THIRTY_DAYS_MS
      const refreshExpiresAt = new Date(Date.now() + refreshTtlMs).toISOString()

      // Ensure cookie writes complete and propagate failures
      return fromPromise(
        Promise.all([
          writeAccessToken(refreshed.accessToken, refreshed.newExpiresAt),
          writeRefreshToken(refreshed.refreshToken, refreshExpiresAt),
        ]),
      ).map(() => NextResponse.json({ ok: true }))
    })

  if (result.isErr()) {
    Sentry.captureException(result.error, { tags: { area: 'refresh_api' } })
    return NextResponse.json(
      { ok: false, error: 'refresh_failed' },
      { status: 401 },
    )
  }

  return result.value
}

export async function POST() {
  return handler()
}
