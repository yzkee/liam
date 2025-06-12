import type { Operation } from 'fast-json-patch'

export interface SchemaData {
  id: string
  schema: Record<string, unknown>
  latestVersionNumber: number
}

export interface DesignSessionData {
  organization_id: string
  messages: Array<{
    id: string
    content: string
    role: 'user' | 'assistant'
    user_id: string | null
    created_at: string
    updated_at: string
    organization_id: string
    design_session_id: string
  }>
}

export interface CreateVersionParams {
  buildingSchemaId: string
  latestVersionNumber: number
  patch: Operation[]
}

export interface VersionResult {
  success: boolean
  error?: string | null
}

/**
 * Schema repository interface for data access abstraction
 */
export interface SchemaRepository {
  /**
   * Fetch schema data for a design session
   */
  getSchema(designSessionId: string): Promise<{
    data: SchemaData | null
    error: { message: string } | null
  }>

  /**
   * Fetch design session data including organization_id and messages
   */
  getDesignSession(designSessionId: string): Promise<DesignSessionData | null>

  /**
   * Create a new schema version with optimistic locking
   */
  createVersion(params: CreateVersionParams): Promise<VersionResult>
}

/**
 * Repository container for dependency injection
 */
export interface Repositories {
  schema: SchemaRepository
}
