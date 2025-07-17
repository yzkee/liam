import { createClient as _createClient } from '@liam-hq/db'
import { err, ok, type Result } from 'neverthrow'

type SupabaseClient = ReturnType<typeof _createClient>

export function createClient(): Result<SupabaseClient, Error> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !supabaseKey) {
    return err(new Error('Missing Supabase environment variables'))
  }

  return ok(_createClient(supabaseUrl, supabaseKey))
}
