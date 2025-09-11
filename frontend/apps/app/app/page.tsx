import { redirect } from 'next/navigation'
import { createClient } from '../libs/db/server'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/design_sessions/new')
  } else {
    redirect('/login')
  }
}
