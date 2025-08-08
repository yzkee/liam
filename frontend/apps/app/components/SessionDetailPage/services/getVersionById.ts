'use server'

import { createClient } from '@/libs/db/server'

export async function getVersionById(versionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('building_schema_versions')
    .select('id, number, patch')
    .eq('id', versionId)
    .single()

  if (error) {
    console.error('Failed to fetch version:', error)
    return null
  }

  return data
}
