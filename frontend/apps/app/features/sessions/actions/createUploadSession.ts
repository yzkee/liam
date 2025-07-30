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
  UploadFormDataSchema,
} from './sessionActionTypes'

async function getCurrentUserId(
  supabase: SupabaseClientType,
): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser()
  return userData?.user?.id || null
}

async function parseSchemaFromFile(
  file: File,
  format: 'schemarb' | 'postgres' | 'prisma' | 'tbls',
): Promise<Schema | CreateSessionState> {
  try {
    setPrismWasmUrl(path.resolve(process.cwd(), 'prism.wasm'))
    const content = await file.text()
    const { value: parsedSchema, errors } = await parse(content, format)

    if (errors && errors.length > 0) {
      return { success: false, error: 'Failed to parse schema file' }
    }

    return parsedSchema
  } catch (error) {
    console.error('Error parsing schema file:', error)
    return { success: false, error: 'Failed to read schema file' }
  }
}

export async function createUploadSession(
  _prevState: CreateSessionState,
  formData: FormData,
): Promise<CreateSessionState> {
  const parsedFormDataResult = parseFormData(formData, UploadFormDataSchema)
  if (!parsedFormDataResult.success) {
    return { success: false, error: 'Invalid form data' }
  }

  const {
    parentDesignSessionId,
    initialMessage,
    isDeepModelingEnabled,
    schemaFile,
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
      project_id: null, // Upload sessions don't have a project
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

  // Parse the uploaded schema file
  const schemaResult = await parseSchemaFromFile(schemaFile, schemaFormat)
  if ('success' in schemaResult) {
    return schemaResult
  }
  const schema = schemaResult

  // Create building schema with uploaded file content
  const { data: buildingSchema, error: buildingSchemaError } = await supabase
    .from('building_schemas')
    .insert({
      design_session_id: designSession.id,
      organization_id: organizationId,
      schema: JSON.parse(JSON.stringify(schema)),
      initial_schema_snapshot: JSON.parse(JSON.stringify(schema)),
      schema_file_path: schemaFile.name,
      git_sha: null, // No git SHA for uploaded files
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
