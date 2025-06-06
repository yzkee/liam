import type { PageProps } from '@/app/types'
import { SessionDetailPage } from '@/components/SessionDetailPage'
import { fetchSchemaData } from '@/components/SessionDetailPage/services/fetchSchemaData'
import { schemaSchema } from '@liam-hq/db-structure'
import type { Schema } from '@liam-hq/db-structure'
import * as v from 'valibot'
import { fetchDesignSessionData } from './services/fetchDesignSessionData'

const paramsSchema = v.object({
  id: v.string(),
})

export default async function Page({ params }: PageProps) {
  const parsedParams = v.safeParse(paramsSchema, await params)
  if (!parsedParams.success) throw new Error('Invalid parameters')

  const designSessionId = parsedParams.output.id

  // Fetch design session data and schema data in parallel
  const [designSessionData, schemaResult] = await Promise.all([
    fetchDesignSessionData(designSessionId),
    fetchSchemaData(designSessionId),
  ])

  if (!designSessionData) {
    throw new Error('Design session not found')
  }

  if (schemaResult.error) {
    throw new Error('Failed to fetch schema data')
  }

  // Provide default schema if data is empty or invalid
  const defaultSchema = {
    tables: {},
    relationships: {},
    tableGroups: {},
  }

  const schemaToValidate = schemaResult.data?.schema || defaultSchema
  const schemaParseResult = v.safeParse(schemaSchema, schemaToValidate)

  let schema: Schema
  if (!schemaParseResult.success) {
    console.error('Schema validation error:', schemaParseResult.issues)
    // Use default schema if validation fails
    const defaultSchemaParseResult = v.safeParse(schemaSchema, defaultSchema)
    if (!defaultSchemaParseResult.success) {
      throw new Error('Failed to create default schema')
    }
    console.warn('Using default schema due to validation failure')
    schema = defaultSchemaParseResult.output
  } else {
    schema = schemaParseResult.output
  }
  const buildingSchemaId = schemaResult.data?.id
  const latestVersionNumber = schemaResult.data?.latestVersionNumber ?? 0

  // buildingSchemaId is required - this should never happen given 1:1 relationship
  if (!buildingSchemaId) {
    throw new Error(
      'Building schema ID not found for design session. Data integrity issue.',
    )
  }

  return (
    <SessionDetailPage
      schema={schema}
      designSession={{
        id: designSessionId,
        organizationId: designSessionData.organization_id,
        buildingSchemaId,
        latestVersionNumber,
      }}
    />
  )
}
