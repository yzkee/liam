import {
  fromAsyncThrowable,
  fromPromise,
  fromValibotSafeParse,
  type Result,
} from '@liam-hq/neverthrow'
import * as Sentry from '@sentry/nextjs'
import { err, errAsync, ok, okAsync, type ResultAsync } from 'neverthrow'
import { NextResponse } from 'next/server'
import * as v from 'valibot'
import type { TokenPayload } from '../../../../../libs/github/cookie'
import {
  readRefreshToken,
  writeAccessToken,
  writeRefreshToken,
} from '../../../../../libs/github/cookie'

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const gitHubTokenSuccessSchema = v.object({
  access_token: v.string(),
  refresh_token: v.string(),
  token_type: v.string(),
  expires_in: v.number(), // seconds
  refresh_token_expires_in: v.optional(v.number()), // seconds
})

type GitHubTokenSuccess = v.InferOutput<typeof gitHubTokenSuccessSchema>

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

function parseGitHubRefreshResponse(
  json: unknown,
): Result<GitHubTokenSuccess, Error> {
  return fromValibotSafeParse(gitHubTokenSuccessSchema, json)
}

type RefreshAccessTokenResult = {
  accessToken: string
  refreshToken: string
  refreshTokenExpiresIn: number | null
  newExpiresAt: string
}

function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): ResultAsync<RefreshAccessTokenResult, Error> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const tryFetch: ResultAsync<Response, Error> = fromAsyncThrowable(async () =>
    fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
    }),
  )()

  const tryParse = (res: Response): ResultAsync<GitHubTokenSuccess, Error> => {
    if (!res.ok) {
      const text = res.statusText
      return errAsync(
        new Error(`GitHub token refresh failed: ${res.status} ${text}`),
      )
    }
    return fromPromise(res.json().catch(() => null)).andThen((json) =>
      parseGitHubRefreshResponse(json),
    )
  }

  const tryFormat = (
    success: GitHubTokenSuccess,
  ): ResultAsync<RefreshAccessTokenResult, Error> => {
    return okAsync({
      accessToken: success.access_token,
      refreshToken: success.refresh_token,
      refreshTokenExpiresIn: success.refresh_token_expires_in ?? null,
      newExpiresAt: new Date(
        Date.now() + success.expires_in * 1000,
      ).toISOString(),
    })
  }

  return tryFetch.andThen(tryParse).andThen(tryFormat)
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
  const refreshTokenResult: ResultAsync<TokenPayload, Error> =
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
