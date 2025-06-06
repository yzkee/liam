import { createClient } from '@/libs/db/server'
import { applyPatchOperations, operationsSchema } from '@/libs/schema'
import * as v from 'valibot'

async function query(designSessionId: string) {
  const supabase = await createClient()

  // Get building schema with initial snapshot
  const { data: buildingSchema, error: buildingSchemaError } = await supabase
    .from('building_schemas')
    .select('id, initial_schema_snapshot')
    .eq('design_session_id', designSessionId)
    .single()

  if (buildingSchemaError || !buildingSchema) {
    return { data: null, error: buildingSchemaError }
  }

  // Get all schema versions to apply patches
  const { data: versions, error: versionsError } = await supabase
    .from('building_schema_versions')
    .select('number, patch')
    .eq('building_schema_id', buildingSchema.id)
    .order('number', { ascending: true })

  if (versionsError) {
    return { data: null, error: versionsError }
  }

  // Start with initial schema snapshot or empty schema
  const currentSchema: Record<string, unknown> =
    typeof buildingSchema.initial_schema_snapshot === 'object' &&
    buildingSchema.initial_schema_snapshot !== null
      ? JSON.parse(JSON.stringify(buildingSchema.initial_schema_snapshot))
      : { tables: {}, relationships: {}, tableGroups: {} }

  // Apply all patches in order
  if (versions && versions.length > 0) {
    for (const version of versions) {
      // Validate and apply patch operations
      const patchParsed = v.safeParse(operationsSchema, version.patch)
      if (patchParsed.success) {
        applyPatchOperations(currentSchema, patchParsed.output)
      } else {
        console.warn(
          `Invalid patch operations in version ${version.number}:`,
          version.patch,
        )
      }
    }
  }

  // Get the latest version number
  const latestVersionNumber =
    versions && versions.length > 0
      ? Math.max(...versions.map((v) => v.number))
      : 0

  return {
    data: {
      id: buildingSchema.id,
      schema: currentSchema,
      latestVersionNumber,
    },
    error: null,
  }
}

export async function fetchSchemaData(designSessionId: string | null) {
  if (!designSessionId) {
    return { data: null, error: null }
  }

  return await query(designSessionId)
}
