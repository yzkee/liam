'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { getOrganizationId } from '../../../features/organizations/services/getOrganizationId'
import { createClient } from '../../../libs/db/server'

const schemaFilePathSchema = v.object({
  projectId: v.string(),
  path: v.pipe(v.string(), v.minLength(1, 'Path is required')),
  format: v.picklist(['schemarb', 'postgres', 'prisma', 'tbls']),
})

type SchemaFilePathInput = v.InferOutput<typeof schemaFilePathSchema>

export async function saveSchemaFilePath(
  _prevState: {
    success: boolean
    error: string | null
    message: string | null
  },
  formData: FormData,
): Promise<{ success: boolean; error: string | null; message: string | null }> {
  const rawData = {
    projectId: formData.get('projectId'),
    path: formData.get('path'),
    format: formData.get('format'),
  }

  const result = v.safeParse(schemaFilePathSchema, rawData)
  if (!result.success) {
    return {
      success: false,
      error: result.issues[0]?.message || 'Invalid input',
      message: null,
    }
  }

  const { projectId, path, format }: SchemaFilePathInput = result.output

  const organizationIdResult = await getOrganizationId()
  if (organizationIdResult.isErr()) {
    return {
      success: false,
      error: organizationIdResult.error.message,
      message: null,
    }
  }
  const organizationId = organizationIdResult.value

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('schema_file_paths')
    .select('id')
    .eq('project_id', projectId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('schema_file_paths')
      .update({
        path: path.trim(),
        format,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)

    if (error) {
      console.error('Error updating schema file path:', error)
      return {
        success: false,
        error:
          error.code === 'PGRST301'
            ? 'Unauthorized: You do not have permission to update this project'
            : 'Failed to update schema file path',
        message: null,
      }
    }

    revalidatePath(`/projects/${projectId}`)
    return {
      success: true,
      error: null,
      message: 'Schema file path updated successfully',
    }
  }

  const { error } = await supabase.from('schema_file_paths').insert({
    project_id: projectId,
    path: path.trim(),
    format,
    organization_id: organizationId,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Error creating schema file path:', error)
    return {
      success: false,
      error:
        error.code === 'PGRST301'
          ? 'Unauthorized: You do not have permission to access this project'
          : 'Failed to save schema file path',
      message: null,
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return {
    success: true,
    error: null,
    message: 'Schema file path saved successfully',
  }
}
