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
      // Debug: Check if session was established correctly
      const {
        data: { session },
      } = await supabase.auth.getSession()
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.warn('[Auth Callback] Session after exchange:', {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionEmail: session?.user?.email,
      })

      // Debug: Check if user can be retrieved
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.warn('[Auth Callback] User after exchange:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userError: userError?.message,
      })

      // Debug: Log before organization creation
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.warn('[Auth Callback] Calling ensureUserHasOrganization...')
      await ensureUserHasOrganization()
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.warn('[Auth Callback] ensureUserHasOrganization completed')

      // Debug: Verify session still exists after organization creation
      const {
        data: { session: sessionAfter },
      } = await supabase.auth.getSession()
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.warn('[Auth Callback] Session after organization creation:', {
        hasSession: !!sessionAfter,
        sessionUserId: sessionAfter?.user?.id,
      })

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
    // Debug: Log authentication error
    if (error) {
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.error('[Auth Callback] Error exchanging code for session:', {
        error: error.message,
        errorCode: error.code,
        errorStatus: error.status,
      })
    }
  }

  // On error, redirect to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
