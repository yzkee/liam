'use server'

import { createClient } from '@/libs/db/server'

interface DesignSessionData {
  organization_id: string
}

/**
 * Fetch design session data including organization_id
 * @param designSessionId The design session ID
 * @returns Design session data or null if not found
 */
export async function fetchDesignSessionData(
  designSessionId: string,
): Promise<DesignSessionData | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('design_sessions')
    .select('organization_id')
    .eq('id', designSessionId)
    .single()

  if (error || !data) {
    console.error(
      `Could not fetch design session data for ${designSessionId}:`,
      error,
    )
    return null
  }

  return data
}
