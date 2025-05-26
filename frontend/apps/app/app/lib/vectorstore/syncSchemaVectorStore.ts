import { createClient } from '@liam-hq/db'
import type { Schema } from '@liam-hq/db-structure'
import type { Tables } from '@liam-hq/db/supabase/database.types'
import {
  createSupabaseVectorStore,
  isSchemaUpdated,
} from './supabaseVectorStore'

/**
 * Schema file path data with projects relation
 * Based on the schema_file_paths table with added projects field from join query
 */
type SchemaFilePathData = Pick<
  Tables<'schema_file_paths'>,
  'path' | 'format' | 'organization_id'
> & {
  projects?: {
    organization_id: string
  }
}

/**
 * Creates a Supabase client with service role key
 * @returns Supabase client
 */
function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

/**
 * Handles errors consistently throughout the application
 * @param message Error message prefix
 * @param error The error object
 * @throws The original error with a consistent message format
 */
function handleError(message: string, error: unknown): never {
  const errorMessage = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}: ${errorMessage}\n`)
  throw error instanceof Error
    ? error
    : new Error(`${message}: ${errorMessage}`)
}

/**
 * Fetches schema file path from database using project ID
 * @param projectId UUID of the project
 * @returns Schema file path data
 */
async function getSchemaFilePathFromProject(
  projectId: string,
): Promise<SchemaFilePathData> {
  try {
    // Create Supabase client
    const supabaseClient = createSupabaseClient()

    // Query schema_file_paths table and join with projects to get organization_id
    const { data, error } = await supabaseClient
      .from('schema_file_paths')
      .select('path, format, projects:project_id(organization_id)')
      .eq('project_id', projectId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch schema file path: ${error.message}`)
    }

    if (!data) {
      throw new Error(`No schema file path found for project ID: ${projectId}`)
    }

    return data as SchemaFilePathData
  } catch (error) {
    return handleError('Error fetching schema file path', error)
  }
}

/**
 * Validates required environment variables
 * @returns True if all required environment variables are set
 */
function validateEnvironmentVariables(): boolean {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ]

  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    process.stderr.write(
      'Error: The following required environment variables are missing:\n',
    )
    for (const varName of missingVars) {
      process.stderr.write(`  - ${varName}\n`)
    }
    process.stderr.write(
      '\nPlease set these variables in your .env.local file.\n',
    )
    return false
  }

  return true
}

/**
 * Synchronizes schema data with vector store
 * Can be called directly from API routes
 * @param schemaData The schema data to synchronize
 * @param projectId Optional project ID to get organization ID
 * @param forceUpdate Force update even if schema hasn't changed
 * @returns True if synchronization was performed, false otherwise
 */
export async function syncSchemaVectorStore(
  schemaData: Schema,
  projectId: string,
  forceUpdate = false,
): Promise<boolean> {
  try {
    // Validate environment variables
    if (!validateEnvironmentVariables()) {
      throw new Error('Required environment variables are missing')
    }

    // Check if schema has been updated
    const needsUpdate = forceUpdate || (await isSchemaUpdated(schemaData))

    if (needsUpdate) {
      let organizationId: string | undefined

      // Get organization ID from project
      try {
        const schemaFilePathData = await getSchemaFilePathFromProject(projectId)
        organizationId = schemaFilePathData.projects?.organization_id
      } catch (error) {
        process.stderr.write(`Error fetching organization ID: ${error}\n`)
        // Continue processing even if there's an error
      }

      // Only proceed with vector store synchronization if we have an organization ID
      if (!organizationId) {
        process.stderr.write(
          'Organization ID not found. Skipping vector store synchronization.\n',
        )
        return false
      }

      // Initialize or update vector store
      await createSupabaseVectorStore(schemaData, organizationId)
      return true
    }

    return false
  } catch (error) {
    process.stderr.write(`Error synchronizing vector store: ${error}\n`)
    throw error
  }
}
