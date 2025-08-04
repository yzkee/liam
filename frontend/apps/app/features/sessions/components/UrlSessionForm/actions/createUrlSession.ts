'use server'

import type { Schema } from '@liam-hq/db-structure'
import {
  createSessionWithSchema,
  parseSchemaContent,
} from '../../shared/services/sessionCreationHelpers'
import {
  type CreateSessionState,
  parseFormData,
  type SchemaFormat,
  UrlFormDataSchema,
} from '../../shared/validation/sessionFormValidation'

async function fetchSchemaFromUrl(
  url: string,
  format: SchemaFormat,
): Promise<Schema | CreateSessionState> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch schema from URL' }
    }

    const content = await response.text()
    return await parseSchemaContent(content, format)
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

  const schemaResult = await fetchSchemaFromUrl(schemaUrl, schemaFormat)
  if ('success' in schemaResult) {
    return schemaResult
  }
  const schema = schemaResult

  return await createSessionWithSchema(
    {
      parentDesignSessionId,
      initialMessage,
      isDeepModelingEnabled,
      projectId: null,
      gitSha: null,
    },
    {
      schema,
      schemaFilePath: schemaUrl,
    },
  )
}
