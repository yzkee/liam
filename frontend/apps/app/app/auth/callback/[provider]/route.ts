import { NextResponse } from 'next/server'
import { ensureUserHasOrganization } from '../../../../components/LoginPage/services/ensureUserHasOrganization'
import { sanitizeReturnPath } from '../../../../components/LoginPage/services/validateReturnPath'
import { createClient } from '../../../../libs/db/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Use query parameter "next" to redirect after auth, sanitize for security
  const next = sanitizeReturnPath(searchParams.get('next'), '/')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await ensureUserHasOrganization()

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('OAuth callback code exchange failed:', {
      error: error.message,
      code: error.status,
      provider: request.url.includes('/github') ? 'github' : 'unknown',
      timestamp: new Date().toISOString(),
    })
  } else {
    console.error('OAuth callback missing code parameter:', {
      url: request.url,
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.redirect(`${origin}/error`)
}
