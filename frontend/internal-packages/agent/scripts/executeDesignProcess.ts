#!/usr/bin/env tsx

import { resolve } from 'node:path'
import { HumanMessage } from '@langchain/core/messages'
import { END, START, StateGraph } from '@langchain/langgraph'
import { config } from 'dotenv'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'

// Load environment variables from ../../../../.env
config({ path: resolve(__dirname, '../../../../.env') })

import { createClient, type SupabaseClientType } from '@liam-hq/db'
// Import required types and utilities
import type { Schema } from '@liam-hq/db-structure'
import { designSchemaNode } from '../src/chat/workflow/nodes/designSchemaNode'
import { createAnnotations } from '../src/chat/workflow/shared/langGraphUtils'
import type {
  WorkflowConfigurable,
  WorkflowState,
} from '../src/chat/workflow/types'
import { invokeSchemaDesignToolNode } from '../src/db-agent/nodes/invokeSchemaDesignToolNode'
import { shouldInvokeSchemaDesignTool } from '../src/db-agent/routing/shouldInvokeSchemaDesignTool'
import { createSupabaseRepositories } from '../src/repositories/factory'

// Simple logger implementation
const logger = {
  debug: (message: string, metadata?: Record<string, unknown>) =>
    process.stdout.write(
      `[DEBUG] ${message} ${metadata ? JSON.stringify(metadata, null, 2) : ''}\n`,
    ),
  log: (message: string, metadata?: Record<string, unknown>) =>
    process.stdout.write(
      `[LOG] ${message} ${metadata ? JSON.stringify(metadata, null, 2) : ''}\n`,
    ),
  info: (message: string, metadata?: Record<string, unknown>) =>
    process.stdout.write(
      `[INFO] ${message} ${metadata ? JSON.stringify(metadata, null, 2) : ''}\n`,
    ),
  warn: (message: string, metadata?: Record<string, unknown>) =>
    process.stdout.write(
      `[WARN] ${message} ${metadata ? JSON.stringify(metadata, null, 2) : ''}\n`,
    ),
  error: (message: string, metadata?: Record<string, unknown>) =>
    process.stderr.write(
      `[ERROR] ${message} ${metadata ? JSON.stringify(metadata, null, 2) : ''}\n`,
    ),
}

/**
 * Create simplified LangGraph with only designSchema and invokeSchemaDesignTool nodes
 */
const createSimplifiedGraph = () => {
  const ChatStateAnnotation = createAnnotations()
  const graph = new StateGraph(ChatStateAnnotation)

  // Add only the nodes we need
  graph
    .addNode('designSchema', designSchemaNode, {
      retryPolicy: { maxAttempts: 3 },
    })
    .addNode('invokeSchemaDesignTool', invokeSchemaDesignToolNode, {
      retryPolicy: { maxAttempts: 3 },
    })

    // Simple workflow: START -> designSchema -> conditional -> invokeSchemaDesignTool -> END
    .addEdge(START, 'designSchema')
    .addEdge('invokeSchemaDesignTool', 'designSchema')
    .addConditionalEdges('designSchema', shouldInvokeSchemaDesignTool, {
      invokeSchemaDesignTool: 'invokeSchemaDesignTool',
      executeDDL: END, // In simplified version, skip DDL and go to complete
    })

  return graph.compile()
}

/**
 * Get the first organization from database
 */
const getFirstOrganization = async (
  supabaseClient: SupabaseClientType,
): Promise<Result<{ id: string; name: string }, Error>> => {
  const { data: organizations, error } = await supabaseClient
    .from('organizations')
    .select('id, name')
    .limit(1)
    .single()

  if (error || !organizations) {
    return err(
      new Error(
        `Failed to fetch organization: ${error?.message || 'No organizations found'}`,
      ),
    )
  }

  return ok(organizations)
}

/**
 * Get existing user (no creation)
 */
const getUser = async (
  supabaseClient: SupabaseClientType,
): Promise<Result<{ id: string; email: string }, Error>> => {
  // Try to find an existing user
  const { data: existingUser, error: findError } = await supabaseClient
    .from('users')
    .select('id, email')
    .limit(1)
    .single()

  if (existingUser && !findError) {
    return ok(existingUser)
  }

  // Return error if no user exists
  return err(
    new Error(
      `No existing user found: ${findError?.message || 'No users in database'}`,
    ),
  )
}

/**
 * Create design session record
 */
const createDesignSession = async (
  supabaseClient: SupabaseClientType,
  organizationId: string,
  userId: string,
): Promise<Result<{ id: string; name: string }, Error>> => {
  const { data: designSession, error: insertError } = await supabaseClient
    .from('design_sessions')
    .insert({
      name: `Design Session - ${new Date().toISOString()}`,
      project_id: null, // No project for this session
      organization_id: organizationId,
      created_by_user_id: userId,
      parent_design_session_id: null,
    })
    .select()
    .single()

  if (insertError || !designSession) {
    return err(
      new Error(`Failed to create design session: ${insertError?.message}`),
    )
  }

  return ok(designSession)
}

/**
 * Create building schema record
 */
const createBuildingSchema = async (
  supabaseClient: SupabaseClientType,
  designSessionId: string,
  organizationId: string,
  initialSchema: Schema,
): Promise<Result<{ id: string; latest_version_number: number }, Error>> => {
  const { data: buildingSchema, error: buildingSchemaError } =
    await supabaseClient
      .from('building_schemas')
      .insert({
        design_session_id: designSessionId,
        organization_id: organizationId,
        schema: JSON.parse(JSON.stringify(initialSchema)),
        initial_schema_snapshot: JSON.parse(JSON.stringify(initialSchema)),
        schema_file_path: null,
        git_sha: null,
      })
      .select()
      .single()

  if (buildingSchemaError || !buildingSchema) {
    return err(
      new Error(
        `Failed to create building schema: ${buildingSchemaError?.message}`,
      ),
    )
  }

  return ok({
    id: buildingSchema.id,
    latest_version_number: 0,
  })
}

/**
 * Create minimal data for the workflow
 */
const createWorkflowState = async (
  organizationId: string,
  buildingSchemaId: string,
  latestVersionNumber: number,
  designSessionId: string,
  userId: string,
): Promise<WorkflowState> => {
  // Empty schema for testing - let AI design from scratch
  const sampleSchema: Schema = {
    tables: {},
  }

  const userInput = `Design a business management system database with the following core requirements:

1. **Organization Structure**:
   - Hierarchical organizations with self-referencing parent-child relationships
   - Each organization has a unique code and name

2. **Position & Employee Management**:
   - Position master table with unique position codes and names
   - Employee master table with employee codes and names
   - Employee affiliations linking employees to organizations and positions
   - Support for reporting relationships (employees reporting to other employees)

3. **Business Partner System**:
   - Unified business partner table for both clients and suppliers
   - Business partner categories with CHECK constraints (CLIENT/SUPPLIER)
   - Client-specific data with order amounts from last year
   - Supplier-specific data with procurement amounts from last year

4. **Product Management**:
   - Brand master table with unique brand names
   - Item categories for product classification
   - Items with manufacturer part numbers as primary keys
   - Items linked to brands and categories
   - Supplier-brand handling relationships

Please design a normalized database schema with proper primary keys, foreign key relationships, and constraints to support these business operations effectively.`

  return {
    userInput,
    messages: [new HumanMessage(userInput)],
    schemaData: sampleSchema,
    buildingSchemaId,
    latestVersionNumber,
    designSessionId,
    userId,
    organizationId,
    retryCount: {},
  }
}

/**
 * Main execution function
 */
const executeDesignProcess = async (): Promise<Result<void, Error>> => {
  logger.info('Starting design process execution...')

  // Validate required environment variables

  if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    return err(
      new Error(
        'SUPABASE_SERVICE_ROLE_KEY is required - please set it in .env file',
      ),
    )
  }
  if (!process.env['NEXT_PUBLIC_SUPABASE_URL']) {
    return err(
      new Error(
        'NEXT_PUBLIC_SUPABASE_URL is required - please set it in .env file',
      ),
    )
  }
  if (!process.env['OPENAI_API_KEY']) {
    return err(
      new Error('OPENAI_API_KEY is required - please set it in .env file'),
    )
  }

  // Create Supabase client with service role
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !supabaseKey) {
    return err(new Error('Required environment variables are missing'))
  }

  const supabaseClient = createClient(supabaseUrl, supabaseKey)
  const repositories = createSupabaseRepositories(supabaseClient)

  // Get first organization from database
  logger.info('Fetching organization from database...')
  const organizationResult = await getFirstOrganization(supabaseClient)
  if (organizationResult.isErr()) {
    return err(organizationResult.error)
  }
  const organization = organizationResult.value
  logger.info('Found organization:', {
    id: organization.id,
    name: organization.name,
  })

  // Get existing user (no creation)
  logger.info('Getting existing user...')
  const userResult = await getUser(supabaseClient)
  if (userResult.isErr()) {
    return err(userResult.error)
  }
  const user = userResult.value
  logger.info('User found:', { id: user.id, email: user.email })

  // Create design session
  logger.info('Creating design session...')
  const designSessionResult = await createDesignSession(
    supabaseClient,
    organization.id,
    user.id,
  )
  if (designSessionResult.isErr()) {
    return err(designSessionResult.error)
  }
  const designSession = designSessionResult.value
  logger.info('Design session created:', {
    id: designSession.id,
    name: designSession.name,
  })

  // Create building schema with empty initial schema
  const initialSchema = { tables: {} }
  logger.info('Creating building schema...')
  const buildingSchemaResult = await createBuildingSchema(
    supabaseClient,
    designSession.id,
    organization.id,
    initialSchema,
  )
  if (buildingSchemaResult.isErr()) {
    return err(buildingSchemaResult.error)
  }
  const buildingSchema = buildingSchemaResult.value
  logger.info('Building schema created:', {
    id: buildingSchema.id,
    version: buildingSchema.latest_version_number,
  })

  // Create workflow configuration
  const config: { configurable: WorkflowConfigurable } = {
    configurable: {
      repositories,
      logger,
    },
  }

  // Create workflow state
  const initialState = await createWorkflowState(
    organization.id,
    buildingSchema.id,
    buildingSchema.latest_version_number,
    designSession.id,
    user.id,
  )
  logger.info('Created workflow state:', {
    userInput: initialState.userInput,
    designSessionId: initialState.designSessionId,
    buildingSchemaId: initialState.buildingSchemaId,
    organizationId: initialState.organizationId,
    userId: initialState.userId,
  })

  // Create and execute simplified graph
  logger.info('Creating simplified LangGraph...')
  const graph = createSimplifiedGraph()

  logger.info('Executing workflow...')

  // Use streaming with proper async iterator handling
  const streamResult = await (async () => {
    const stream = await graph.stream(initialState, {
      configurable: config.configurable,
      recursionLimit: 10,
      streamMode: 'values',
    })

    let finalResult = null

    for await (const chunk of stream) {
      logger.info('📍 Workflow step:', {
        chunk: chunk,
      })

      // Keep track of the final result
      finalResult = chunk
    }

    return finalResult
  })()

  if (!streamResult) {
    return err(new Error('No result received from workflow'))
  }

  logger.info('Workflow execution completed successfully!')
  logger.info('Final state:', {
    buildingSchemaVersionId: streamResult.buildingSchemaVersionId,
    error: streamResult.error?.message,
    userInput: streamResult.userInput,
    messages: streamResult.messages,
  })

  if (streamResult.error) {
    logger.error('Workflow completed with error:', {
      message: streamResult.error.message,
    })
    return err(streamResult.error)
  }

  logger.info('Design process completed successfully!')
  return ok(undefined)
}

// Execute if this file is run directly
if (require.main === module) {
  executeDesignProcess().then((result) => {
    if (result.isErr()) {
      logger.error('Failed to execute design process:', {
        error: result.error.message,
      })
      process.exit(1)
    }
  })
}
