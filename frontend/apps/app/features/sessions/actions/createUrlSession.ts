'use server'

import { createHash } from 'node:crypto'
import path from 'node:path'
import type { SupabaseClientType } from '@liam-hq/db'
import type { Schema } from '@liam-hq/db-structure'
import { parse, setPrismWasmUrl } from '@liam-hq/db-structure/parser'
import {
  deepModelingWorkflowTask,
  designProcessWorkflowTask,
} from '@liam-hq/jobs'
import { idempotencyKeys } from '@trigger.dev/sdk'
import { redirect } from 'next/navigation'
import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'
import { createClient } from '@/libs/db/server'
import {
  type CreateSessionState,
  parseFormData,
  UrlFormDataSchema,
} from './sessionActionTypes'

async function getCurrentUserId(
  supabase: SupabaseClientType,
): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser()
  return userData?.user?.id || null
}

async function fetchSchemaFromUrl(
  url: string,
  format: 'schemarb' | 'postgres' | 'prisma' | 'tbls',
): Promise<Schema | CreateSessionState> {
  try {
    setPrismWasmUrl(path.resolve(process.cwd(), 'prism.wasm'))

    const response = await fetch(url)
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch schema from URL' }
    }

    const content = await response.text()
    const { value: parsedSchema, errors } = await parse(content, format)

    if (errors && errors.length > 0) {
      return { success: false, error: 'Failed to parse schema from URL' }
    }

    return parsedSchema
  } catch (error) {
    console.error('Error fetching schema from URL:', error)
    return { success: false, error: 'Failed to fetch schema from URL' }
  }
}

export async function createUrlSession(
  _prevState: CreateSessionState,
  formData: FormData,
): Promise<CreateSessionState> {
  const parsedFormDataResult = parseFormData(formData, UrlFormDataSchema)
  if (!parsedFormDataResult.success) {
    return { success: false, error: 'Invalid form data' }
  }

  const {
    parentDesignSessionId,
    initialMessage,
    isDeepModelingEnabled,
    schemaUrl,
    schemaFormat,
  } = parsedFormDataResult.output

  const supabase = await createClient()
  const currentUserId = await getCurrentUserId(supabase)
  if (!currentUserId) {
    return { success: false, error: 'Authentication required' }
  }

  const organizationId = await getOrganizationId()
  if (!organizationId) {
    return { success: false, error: 'Organization not found' }
  }

  // Create design session
  const { data: designSession, error: insertError } = await supabase
    .from('design_sessions')
    .insert({
      name: `Design Session - ${new Date().toISOString()}`,
      project_id: null, // URL sessions don't have a project
      organization_id: organizationId,
      created_by_user_id: currentUserId,
      parent_design_session_id: parentDesignSessionId,
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating design session:', insertError)
    return { success: false, error: 'Failed to create design session' }
  }

  // Fetch and parse the schema from URL
  const schemaResult = await fetchSchemaFromUrl(schemaUrl, schemaFormat)
  if ('success' in schemaResult) {
    return schemaResult
  }
  const schema = schemaResult

  // Create building schema with fetched URL content
  const { data: buildingSchema, error: buildingSchemaError } = await supabase
    .from('building_schemas')
    .insert({
      design_session_id: designSession.id,
      organization_id: organizationId,
      schema: JSON.parse(JSON.stringify(schema)),
      initial_schema_snapshot: JSON.parse(JSON.stringify(schema)),
      schema_file_path: schemaUrl,
      git_sha: null, // No git SHA for URL-based schemas
    })
    .select()
    .single()

  if (buildingSchemaError || !buildingSchema) {
    console.error('Error creating building schema:', buildingSchemaError)
    return { success: false, error: 'Failed to create building schema' }
  }

  // Trigger the chat processing job for the initial message
  const history: [string, string][] = []
  const chatPayload = {
    userInput: initialMessage,
    history,
    organizationId,
    buildingSchemaId: buildingSchema.id,
    latestVersionNumber: 0,
    designSessionId: designSession.id,
    userId: currentUserId,
  }

  // Generate idempotency key based on the payload
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(chatPayload))
    .digest('hex')

  const idempotencyKey = await idempotencyKeys.create(
    `chat-${designSession.id}-${payloadHash}`,
  )

  // Trigger the appropriate workflow based on Deep Modeling toggle
  try {
    const task = isDeepModelingEnabled
      ? deepModelingWorkflowTask
      : designProcessWorkflowTask
    await task.trigger(chatPayload, {
      idempotencyKey,
    })
  } catch (error) {
    console.error('Error triggering chat processing job:', error)
    return { success: false, error: 'Failed to trigger chat processing job' }
  }

  // Redirect to the session page on successful creation
  redirect(`/app/design_sessions/${designSession.id}`)
}
