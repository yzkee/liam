import {
  fromPromise,
  fromValibotSafeParse,
  type Result,
} from '@liam-hq/neverthrow'
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
  refreshTokenExpiresIn: number
  newExpiresAt: string
}

// GitHub OAuth token refresh response schema
const GitHubTokenRefreshResponseSchema = v.object({
  access_token: v.string(),
  token_type: v.string(),
  scope: v.optional(v.string()),
  expires_in: v.number(),
  refresh_token: v.string(),
  refresh_token_expires_in: v.number(),
})

function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): ResultAsync<RefreshAccessTokenResult, Error> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }).toString()

  return ResultAsync.fromPromise(
    fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )
    .andThen((res) => {
      if (!res.ok) {
        return err(new Error(`GitHub token refresh failed: ${res.status}`))
      }
      return ResultAsync.fromPromise<unknown, Error>(res.json(), (e) =>
        e instanceof Error ? e : new Error(String(e)),
      )
    })
    .andThen((data) =>
      fromValibotSafeParse(GitHubTokenRefreshResponseSchema, data),
    )
    .map((data) => {
      const now = Date.now()
      const newExpiresAt = new Date(
        now + Math.max(0, data.expires_in) * 1000,
      ).toISOString()
      const refreshTokenExpiresIn = data.refresh_token_expires_in

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        refreshTokenExpiresIn,
        newExpiresAt,
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
      const rtei = refreshed.refreshTokenExpiresIn
      const refreshTtlMs = rtei * 1000
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
