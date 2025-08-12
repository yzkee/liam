import type { SupabaseClientType, Tables } from '@liam-hq/db'

type VersionInfo = {
  id: string
  number: number
  patch: Tables<'building_schema_versions'>['patch']
}

export const fetchVersionInfo = async (
  supabase: SupabaseClientType,
  versionId: string,
): Promise<VersionInfo | null> => {
  const { data, error } = await supabase
    .from('building_schema_versions')
    .select('id, number, patch')
    .eq('id', versionId)
    .single()

  if (error) {
    console.error('Failed to fetch version info:', error)
    return null
  }

  return data
}
