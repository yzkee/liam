import { createClient } from '../../../../libs/db/server'
import type { RecentSession } from './types'

export const fetchRecentSessions = async (
  organizationId: string,
  limit = 5,
): Promise<RecentSession[]> => {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('design_sessions')
    .select('id, name, created_at, project_id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent sessions:', error)
    return []
  }

  return sessions
}
