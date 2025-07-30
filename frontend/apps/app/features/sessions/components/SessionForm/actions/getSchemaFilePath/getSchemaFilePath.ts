'use server'

import { fetchSchemaFilePath } from './fetchSchemaFilePath'

type SchemaFilePathState = {
  path: string | null
  loading: boolean
  error?: string
}

export async function getSchemaFilePath(
  _prevState: SchemaFilePathState,
  formData: FormData,
): Promise<SchemaFilePathState> {
  const projectId = formData.get('projectId')

  if (!projectId || typeof projectId !== 'string') {
    return { path: null, loading: false }
  }

  const { data, error } = await fetchSchemaFilePath(projectId)

  if (error) {
    return { path: null, loading: false, error }
  }

  return { path: data, loading: false }
}
