import { createClient } from '@/libs/db/client'
import { schemaSchema } from '@liam-hq/db-structure'
import * as v from 'valibot'

// Schema for validating realtime building_schemas payload
const realtimeBuildingSchemaSchema = v.object({
  id: v.string(),
  design_session_id: v.pipe(v.string(), v.uuid()),
  schema: schemaSchema,
  organization_id: v.pipe(v.string(), v.uuid()),
  created_at: v.string(),
  git_sha: v.nullable(v.string()),
  initial_schema_snapshot: v.optional(v.nullable(schemaSchema)), // optional field
  schema_file_path: v.nullable(v.string()),
})
type RealtimeBuildingSchema = v.InferOutput<typeof realtimeBuildingSchemaSchema>

/**
 * Fetch building schema data from client-side
 */
export async function loadBuildingSchema(designSessionId: string) {
  const supabase = createClient()

  return await supabase
    .from('building_schemas')
    .select('schema')
    .eq('design_session_id', designSessionId)
    .single()
}

/**
 * Set up realtime subscription for building_schemas in a design session
 */
export const setupBuildingSchemaRealtimeSubscription = (
  designSessionId: string,
  onSchemaUpdate: (buildingSchema: RealtimeBuildingSchema) => void,
  onError?: (error: Error) => void,
) => {
  const supabase = createClient()

  const subscription = supabase
    .channel(`building_schemas:${designSessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'building_schemas',
        filter: `design_session_id=eq.${designSessionId}`,
      },
      (payload) => {
        try {
          const validatedSchema = v.parse(
            realtimeBuildingSchemaSchema,
            payload.new,
          )
          onSchemaUpdate(validatedSchema)
        } catch (error) {
          onError?.(
            error instanceof Error
              ? error
              : new Error('Invalid schema format or validation failed'),
          )
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
      } else if (status === 'CHANNEL_ERROR') {
        onError?.(new Error('Schema realtime subscription failed'))
      }
    })

  return subscription
}
