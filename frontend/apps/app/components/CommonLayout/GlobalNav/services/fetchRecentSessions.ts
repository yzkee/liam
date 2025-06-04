'use client'

import { createClient } from '@/libs/db/client'
import type { Tables } from '@liam-hq/db/supabase/database.types'
import * as v from 'valibot'

export type RecentSession = Tables<'design_sessions'>

const recentSessionsSchema = v.array(
  v.object({
    id: v.string(),
    name: v.string(),
    created_at: v.string(),
    project_id: v.nullable(v.string()),
  }),
)

export const fetchRecentSessions = async (
  limit = 5,
): Promise<RecentSession[]> => {
  const supabase = createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return []
  }

  const { data: sessions, error } = await supabase
    .from('design_sessions')
    .select('id, name, created_at, project_id')
    .eq('created_by_user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent sessions:', error)
    return []
  }

  const result = v.safeParse(recentSessionsSchema, sessions)
  if (!result.success) {
    console.error('Invalid session data format:', result.issues)
    return []
  }

  return result.output as RecentSession[]
}
