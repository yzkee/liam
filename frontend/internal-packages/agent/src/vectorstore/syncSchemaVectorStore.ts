import type { Schema } from '@liam-hq/db-structure'
import { err, ok } from 'neverthrow'
import type { AgentError, AgentResult } from '../types/errors'
import {
  createSupabaseVectorStore,
  isSchemaUpdated,
} from './supabaseVectorStore'

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
 * @param organizationId Organization ID for vector store
 * @param forceUpdate Force update even if schema hasn't changed
 * @returns True if synchronization was performed, false otherwise
 */
export async function syncSchemaVectorStore(
  schemaData: Schema,
  organizationId: string,
  forceUpdate = false,
): Promise<AgentResult<boolean>> {
  try {
    if (!validateEnvironmentVariables()) {
      return err({
        type: 'ENVIRONMENT_ERROR',
        message: 'Required environment variables are missing',
      })
    }

    const needsUpdate = forceUpdate || (await isSchemaUpdated(schemaData))

    if (needsUpdate) {
      const vectorStoreResult = await createSupabaseVectorStore(
        schemaData,
        organizationId,
      )
      if (vectorStoreResult.isErr()) {
        return err({
          type: 'VECTOR_STORE_ERROR',
          message: `Vector store creation failed: ${vectorStoreResult.error.message}`,
          cause: vectorStoreResult.error.cause,
        })
      }
      return ok(true)
    }

    return ok(false)
  } catch (error) {
    const agentError: AgentError = {
      type: 'VECTOR_STORE_ERROR',
      message:
        error instanceof Error ? error.message : 'Unknown vector store error',
      cause: error,
    }
    process.stderr.write(
      `Error synchronizing vector store: ${agentError.message}\n`,
    )
    return err(agentError)
  }
}
