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
import type { WorkflowState } from '../src/chat/workflow/types'
import { invokeSchemaDesignToolNode } from '../src/db-agent/nodes/invokeSchemaDesignToolNode'
import { routeAfterDesignSchema } from '../src/db-agent/routing/routeAfterDesignSchema'
import { createSupabaseRepositories } from '../src/repositories/factory'

// Type guards for safe property access
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const hasProperty = <T extends string>(
  obj: Record<string, unknown>,
  prop: T,
): obj is Record<T, unknown> & Record<string, unknown> => prop in obj

// Note: getCurrentNodeFromChunk is not currently used but kept for potential future use

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const

type LogLevel = keyof typeof LOG_LEVELS

// Get log level from command line arguments or environment
const getLogLevel = (): LogLevel => {
  const args = process.argv.slice(2)
  const logLevelArg = args
    .find((arg) => arg.startsWith('--log-level='))
    ?.split('=')[1]
  const envLogLevel = process.env['LOG_LEVEL']

  const level = (logLevelArg || envLogLevel || 'INFO').toUpperCase()

  if (
    level === 'DEBUG' ||
    level === 'INFO' ||
    level === 'WARN' ||
    level === 'ERROR'
  ) {
    return level
  }

  console.warn(`Invalid log level: ${level}. Using INFO instead.`)
  return 'INFO'
}

const currentLogLevel = getLogLevel()

// Enhanced logger implementation with configurable log levels
const logger = {
  debug: (message: string, metadata?: Record<string, unknown>) => {
    if (LOG_LEVELS[currentLogLevel] > LOG_LEVELS.DEBUG) return

    const timestamp = new Date().toISOString()
    process.stdout.write(`\n🔍 [DEBUG] ${timestamp} ${message}\n`)
    if (metadata) {
      process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
    }
  },
  log: (message: string, metadata?: Record<string, unknown>) => {
    if (LOG_LEVELS[currentLogLevel] > LOG_LEVELS.DEBUG) return

    const timestamp = new Date().toISOString()
    process.stdout.write(`\n📝 [LOG] ${timestamp} ${message}\n`)
    if (metadata) {
      process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
    }
  },
  info: (message: string, metadata?: Record<string, unknown>) => {
    if (LOG_LEVELS[currentLogLevel] > LOG_LEVELS.INFO) return

    const timestamp = new Date().toISOString()
    process.stdout.write(`\n✅ [INFO] ${timestamp} ${message}\n`)
    if (metadata) {
      process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
    }
  },
  warn: (message: string, metadata?: Record<string, unknown>) => {
    if (LOG_LEVELS[currentLogLevel] > LOG_LEVELS.WARN) return

    const timestamp = new Date().toISOString()
    process.stdout.write(`\n⚠️  [WARN] ${timestamp} ${message}\n`)
    if (metadata) {
      process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
    }
  },
  error: (message: string, metadata?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    process.stderr.write(`\n❌ [ERROR] ${timestamp} ${message}\n`)
    if (metadata) {
      process.stderr.write(`${JSON.stringify(metadata, null, 2)}\n`)
    }
  },
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
    .addConditionalEdges('designSchema', routeAfterDesignSchema, {
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

  // Setup database and workflow
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  const supabaseClient = createClient(supabaseUrl, supabaseKey)
  const repositories = createSupabaseRepositories(supabaseClient)

  // Get organization and user
  logger.debug('Setting up database connections and user data')
  const organizationResult = await getFirstOrganization(supabaseClient)
  if (organizationResult.isErr()) return err(organizationResult.error)
  const organization = organizationResult.value
  logger.debug('Found organization:', {
    id: organization.id,
    name: organization.name,
  })

  const userResult = await getUser(supabaseClient)
  if (userResult.isErr()) return err(userResult.error)
  const user = userResult.value
  logger.debug('Found user:', { id: user.id, email: user.email })

  // Create session and schema
  const designSessionResult = await createDesignSession(
    supabaseClient,
    organization.id,
    user.id,
  )
  if (designSessionResult.isErr()) return err(designSessionResult.error)
  const designSession = designSessionResult.value
  logger.debug('Created design session:', {
    id: designSession.id,
    name: designSession.name,
  })

  const buildingSchemaResult = await createBuildingSchema(
    supabaseClient,
    designSession.id,
    organization.id,
    { tables: {} },
  )
  if (buildingSchemaResult.isErr()) return err(buildingSchemaResult.error)
  const buildingSchema = buildingSchemaResult.value
  logger.debug('Created building schema:', {
    id: buildingSchema.id,
    version: buildingSchema.latest_version_number,
  })

  // Execute workflow
  const config = { configurable: { repositories, logger } }
  const initialState = await createWorkflowState(
    organization.id,
    buildingSchema.id,
    buildingSchema.latest_version_number,
    designSession.id,
    user.id,
  )
  const graph = createSimplifiedGraph()

  logger.info('Starting AI workflow execution...')

  // Helper function to extract message type
  const getMessageType = (lastMessage: unknown): string => {
    let rawMessageType = 'Unknown'

    if (isObject(lastMessage)) {
      if (Array.isArray(lastMessage['lc']) && lastMessage['lc'].length > 2) {
        rawMessageType = String(lastMessage['lc'][2])
      } else if (
        hasProperty(lastMessage, '_getType') &&
        typeof lastMessage['_getType'] === 'function'
      ) {
        rawMessageType = String(lastMessage['_getType']())
      } else if (
        isObject(lastMessage['constructor']) &&
        hasProperty(lastMessage['constructor'], 'name')
      ) {
        rawMessageType = String(lastMessage['constructor']['name'])
      }
    }

    return rawMessageType.toLowerCase().replace('message', '')
  }

  // Helper function to count operations from string
  const countOperationsFromString = (functionArgs: string): string => {
    const operationsMatch = functionArgs.match(/"operations":\s*\[([^\]]*)\]/)
    if (operationsMatch && operationsMatch[1] !== undefined) {
      const commaCount = (operationsMatch[1].match(/,/g) || []).length
      return ` (${commaCount + 1} ops)`
    }
    return ''
  }

  // Helper function to count operations from object
  const countOperationsFromObject = (functionArgs: unknown): string => {
    if (isObject(functionArgs) && hasProperty(functionArgs, 'operations')) {
      const operations = functionArgs.operations
      if (Array.isArray(operations)) {
        return ` (${operations.length} ops)`
      }
    }
    return ''
  }

  // Helper function to extract operations count from function arguments
  const getOperationsCount = (functionArgs: unknown): string => {
    if (!functionArgs) return ''

    if (
      typeof functionArgs === 'string' &&
      functionArgs.includes('operations')
    ) {
      return countOperationsFromString(functionArgs)
    }
    return countOperationsFromObject(functionArgs)
  }

  // Helper function to process tool calls
  const processToolCalls = (toolCalls: unknown[]): string => {
    return toolCalls
      .map((call: unknown) => {
        if (isObject(call)) {
          const functionName =
            isObject(call['function']) && hasProperty(call['function'], 'name')
              ? call['function']['name']
              : call['name']
          const toolName = functionName || 'unknown'

          const functionArgs =
            isObject(call['function']) &&
            hasProperty(call['function'], 'arguments')
              ? call['function']['arguments']
              : call['args']

          const operationsCount = getOperationsCount(functionArgs)
          return `${String(toolName)}${operationsCount}`
        }
        return 'unknown'
      })
      .join(', ')
  }

  // Helper function to extract content from message
  const getMessageContent = (lastMessage: unknown): string | undefined => {
    if (!isObject(lastMessage)) return undefined

    const content =
      lastMessage['content'] ||
      (isObject(lastMessage['kwargs']) &&
      hasProperty(lastMessage['kwargs'], 'content')
        ? lastMessage['kwargs']['content']
        : undefined)

    return typeof content === 'string' ? content : undefined
  }

  // Helper function to extract tool calls from AI message
  const getToolCalls = (lastMessage: unknown): unknown[] => {
    const kwargsToolCalls =
      isObject(lastMessage) &&
      isObject(lastMessage['kwargs']) &&
      hasProperty(lastMessage['kwargs'], 'additional_kwargs') &&
      isObject(lastMessage['kwargs']['additional_kwargs']) &&
      hasProperty(lastMessage['kwargs']['additional_kwargs'], 'tool_calls')
        ? lastMessage['kwargs']['additional_kwargs']['tool_calls']
        : undefined

    const toolCalls =
      (isObject(lastMessage) ? lastMessage['tool_calls'] : undefined) ||
      kwargsToolCalls ||
      []

    return Array.isArray(toolCalls) ? toolCalls : []
  }

  // Helper function to get tool name from message
  const getToolName = (lastMessage: unknown): string => {
    if (!isObject(lastMessage)) return 'unknown'

    const name =
      lastMessage['name'] ||
      (isObject(lastMessage['kwargs']) &&
      hasProperty(lastMessage['kwargs'], 'name')
        ? lastMessage['kwargs']['name']
        : undefined) ||
      'unknown'

    return typeof name === 'string' ? name : 'unknown'
  }

  // Helper function to log human message
  const logHumanMessage = (content: string | undefined) => {
    if (content && typeof content === 'string') {
      logger.info(`Request: ${content}`)
    }
  }

  // Helper function to log AI message
  const logAIMessage = (content: string | undefined, lastMessage: unknown) => {
    const toolCalls = getToolCalls(lastMessage)
    const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0

    if (hasToolCalls) {
      const toolInfo = processToolCalls(toolCalls)
      logger.info(`AI calling: ${toolInfo}`)
    } else if (content && typeof content === 'string' && content.trim()) {
      logger.info(`AI response: ${content.trim()}`)
    }
  }

  // Helper function to log tool message
  const logToolMessage = (
    content: string | undefined,
    lastMessage: unknown,
  ) => {
    const toolName = getToolName(lastMessage)

    if (content && typeof content === 'string') {
      const isError = content.toLowerCase().includes('error')
      const status = isError ? 'ERROR' : 'SUCCESS'
      logger.info(`${String(toolName)} ${status}: ${content}`)
    } else {
      logger.info(`${String(toolName)}: No response`)
    }
  }

  // Helper function to log message content
  const logMessageContent = (messageType: string, lastMessage: unknown) => {
    if (!isObject(lastMessage)) return

    const content = getMessageContent(lastMessage)

    if (messageType === 'human') {
      logHumanMessage(content)
    } else if (messageType === 'ai') {
      logAIMessage(content, lastMessage)
    } else if (messageType === 'tool') {
      logToolMessage(content, lastMessage)
    }
  }

  // Helper function to process stream chunk
  const processStreamChunk = (chunk: unknown) => {
    if (!isObject(chunk) || !Array.isArray(chunk['messages'])) {
      return
    }

    const messages = chunk['messages']
    if (messages.length === 0) {
      return
    }

    const lastMessage = messages[messages.length - 1]

    const messageType = getMessageType(lastMessage)

    // Debug: log full message structure
    if (isObject(lastMessage)) {
      const kwargsAdditional =
        isObject(lastMessage['kwargs']) &&
        hasProperty(lastMessage['kwargs'], 'additional_kwargs')
          ? lastMessage['kwargs']['additional_kwargs']
          : undefined

      logger.debug('Full Message:', {
        messageType,
        content: lastMessage['content'],
        toolCalls: lastMessage['tool_calls'],
        additionalKwargs: kwargsAdditional,
      })
    }

    // Log essential information
    logMessageContent(messageType, lastMessage)
  }

  // Use streaming with proper async iterator handling
  const streamResult = await (async () => {
    const stream = await graph.stream(initialState, {
      configurable: config.configurable,
      recursionLimit: 10,
      streamMode: 'values',
    })

    let finalResult = null

    for await (const chunk of stream) {
      processStreamChunk(chunk)
      finalResult = chunk
    }

    return finalResult
  })()

  if (!streamResult) {
    return err(new Error('No result received from workflow'))
  }

  logger.info('Workflow completed')

  if (streamResult.error) {
    logger.error(`ERROR: ${streamResult.error.message}`)
  }

  if (streamResult.schemaData?.tables) {
    const tableCount = Object.keys(streamResult.schemaData.tables).length
    if (tableCount > 0) {
      const tableNames = Object.keys(streamResult.schemaData.tables)
      logger.info(
        `RESULT: ${tableCount} tables created - ${tableNames.join(', ')}`,
      )
    } else {
      logger.info('RESULT: No tables created')
    }
  }

  if (streamResult.error) {
    return err(streamResult.error)
  }

  return ok(undefined)
}

// Execute if this file is run directly
if (require.main === module) {
  // Show usage information
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    process.exit(0)
  }

  logger.info(
    `Starting design process execution (log level: ${currentLogLevel})`,
  )

  executeDesignProcess().then((result) => {
    if (result.isErr()) {
      logger.error(`FAILED: ${result.error.message}`)
      process.exit(1)
    }
  })
}
