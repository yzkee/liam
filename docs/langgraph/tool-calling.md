# Tool Calling

LangGraph provides powerful tool calling capabilities that allow agents to interact with external systems and perform actions. This guide covers the different patterns for implementing and using tools in LangGraph.js.

## ToolNode Usage

### Basic ToolNode Setup
Create and configure tools for use within LangGraph nodes.

```typescript
import { tool } from '@langchain/core/tools'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import * as v from 'valibot'

// Define a basic tool
const calculatorTool = tool(
  async (input: { operation: string; a: number; b: number }) => {
    const { operation, a, b } = input
    switch (operation) {
      case 'add':
        return `${a} + ${b} = ${a + b}`
      case 'multiply':
        return `${a} * ${b} = ${a * b}`
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  },
  {
    name: 'calculator',
    description: 'Perform basic arithmetic operations',
    schema: v.object({
      operation: v.string(),
      a: v.number(),
      b: v.number()
    })
  }
)

// Create a ToolNode
const toolNode = new ToolNode([calculatorTool])
```

### Tool Registration and Binding
Register multiple tools and bind them to language models.

```typescript
import { ChatOpenAI } from '@langchain/openai'

// Define multiple tools
const tools = [
  calculatorTool,
  schemaDesignTool,
  validationTool
]

// Bind tools to the language model
const llmWithTools = new ChatOpenAI({
  model: 'gpt-4',
  temperature: 0
}).bindTools(tools)

// Create ToolNode with multiple tools
const multiToolNode = new ToolNode(tools)

// Add to graph
graph
  .addNode('agent', llmWithTools)
  .addNode('tools', multiToolNode)
  .addEdge('agent', 'tools')
  .addEdge('tools', 'agent')
```

### Multiple Tool Execution
Handle scenarios where multiple tools need to be executed in sequence or parallel.

```typescript
// Sequential tool execution
export async function sequentialToolExecution(state: AgentState) {
  const results = []
  
  for (const toolCall of state.toolCalls) {
    const tool = findTool(toolCall.name)
    const result = await tool.invoke(toolCall.args)
    results.push({
      toolCallId: toolCall.id,
      result
    })
  }
  
  return { ...state, toolResults: results }
}

// Parallel tool execution
export async function parallelToolExecution(state: AgentState) {
  const toolPromises = state.toolCalls.map(async (toolCall) => {
    const tool = findTool(toolCall.name)
    const result = await tool.invoke(toolCall.args)
    return {
      toolCallId: toolCall.id,
      result
    }
  })
  
  const results = await Promise.all(toolPromises)
  return { ...state, toolResults: results }
}
```

## Tool Calling Patterns

### Force Tool Calling
Ensure that specific tools are called when certain conditions are met.

```typescript
// Force tool calling with conditional logic
export async function forceToolCalling(state: AgentState) {
  const { messages, requiresValidation } = state
  
  if (requiresValidation) {
    // Force validation tool call
    const validationCall = {
      id: crypto.randomUUID(),
      name: 'validateSchema',
      args: { schema: state.currentSchema }
    }
    
    return {
      ...state,
      messages: [
        ...messages,
        new AIMessage({
          content: '',
          tool_calls: [validationCall]
        })
      ]
    }
  }
  
  return state
}

// Force specific tool based on state conditions
export function shouldForceToolCall(state: AgentState): string | null {
  if (state.schemaErrors?.length > 0) {
    return 'schemaValidationTool'
  }
  if (state.requiresTestGeneration) {
    return 'testGenerationTool'
  }
  return null
}
```

### Tool Call Error Handling
Implement robust error handling for tool execution failures.

```typescript
// Comprehensive tool error handling
export async function handleToolErrors(state: AgentState) {
  const results = []
  
  for (const toolCall of state.toolCalls) {
    try {
      const tool = findTool(toolCall.name)
      const result = await tool.invoke(toolCall.args)
      
      results.push({
        toolCallId: toolCall.id,
        result,
        success: true
      })
    } catch (error) {
      // Handle different types of errors
      if (error instanceof ValidationError) {
        results.push({
          toolCallId: toolCall.id,
          error: `Validation failed: ${error.message}`,
          success: false,
          retryable: true
        })
      } else if (error instanceof NetworkError) {
        results.push({
          toolCallId: toolCall.id,
          error: `Network error: ${error.message}`,
          success: false,
          retryable: true
        })
      } else {
        results.push({
          toolCallId: toolCall.id,
          error: `Tool execution failed: ${error.message}`,
          success: false,
          retryable: false
        })
      }
    }
  }
  
  return { ...state, toolResults: results }
}
```

### Runtime Values to Tools
Pass dynamic runtime values and configuration to tools.

```typescript
// Pass runtime configuration to tools
export const schemaDesignTool = tool(
  async (input: unknown, config: RunnableConfig): Promise<string> => {
    // Extract runtime configuration
    const toolConfigurable = getToolConfigurable(config)
    if (toolConfigurable.isErr()) {
      throw new Error(`Configuration error: ${toolConfigurable.error.message}`)
    }
    
    const { repositories, buildingSchemaId, designSessionId } = toolConfigurable.value
    
    // Use runtime values in tool execution
    const schemaResult = await repositories.schema.getSchema(designSessionId)
    const operations = parseOperations(input)
    
    // Apply operations with runtime context
    return await applySchemaOperations(operations, schemaResult.value, {
      buildingSchemaId,
      designSessionId
    })
  },
  {
    name: 'schemaDesignTool',
    description: 'Design database schemas with runtime configuration',
    schema: operationsSchema
  }
)

// Configure tools with runtime values
export function configureToolsWithRuntime(
  tools: StructuredTool[],
  runtimeConfig: RuntimeConfig
) {
  return tools.map(tool => ({
    ...tool,
    invoke: (input: any, config?: RunnableConfig) => 
      tool.invoke(input, {
        ...config,
        configurable: {
          ...config?.configurable,
          ...runtimeConfig
        }
      })
  }))
}
```

## State Updates from Tools

### Tool-driven State Changes
Allow tools to modify the graph state based on their execution results.

```typescript
// Tool that updates state based on execution results
export async function stateUpdatingToolNode(state: DbAgentState) {
  const toolResult = await schemaDesignTool.invoke(
    { operations: state.operations },
    { configurable: getToolConfigurable(state) }
  )
  
  // Parse tool result and update state accordingly
  if (toolResult.includes('successfully updated')) {
    return {
      ...state,
      schemaUpdated: true,
      lastOperation: 'schema_update',
      errors: [],
      nextAction: 'generateTestcase'
    }
  } else if (toolResult.includes('validation failed')) {
    return {
      ...state,
      schemaUpdated: false,
      errors: extractErrors(toolResult),
      nextAction: 'retry_design'
    }
  }
  
  return state
}

// Extract structured updates from tool results
export function parseToolStateUpdates(toolResult: string): Partial<DbAgentState> {
  const updates: Partial<DbAgentState> = {}
  
  if (toolResult.includes('DDL validation successful')) {
    updates.validationStatus = 'passed'
    updates.canProceed = true
  }
  
  if (toolResult.includes('new version created')) {
    updates.versionCreated = true
    updates.needsVersioning = false
  }
  
  return updates
}
```

### Tool Result Processing
Process and transform tool results for use in subsequent nodes.

```typescript
// Process tool results for downstream consumption
export function processToolResults(toolResults: ToolResult[]): ProcessedResults {
  const successful = toolResults.filter(r => r.success)
  const failed = toolResults.filter(r => !r.success)
  
  return {
    successCount: successful.length,
    failureCount: failed.length,
    results: successful.map(r => r.result),
    errors: failed.map(r => r.error),
    shouldRetry: failed.some(r => r.retryable),
    nextAction: determineNextAction(successful, failed)
  }
}

// Transform tool results into actionable state updates
export function transformToolResults(
  results: ToolResult[],
  currentState: AgentState
): Partial<AgentState> {
  const updates: Partial<AgentState> = {}
  
  for (const result of results) {
    switch (result.toolName) {
      case 'schemaDesignTool':
        updates.schemaOperationResult = result.result
        updates.schemaModified = result.success
        break
      case 'validationTool':
        updates.validationResult = result.result
        updates.isValid = result.success
        break
      case 'testGenerationTool':
        updates.testCases = parseTestCases(result.result)
        updates.testsGenerated = result.success
        break
    }
  }
  
  return updates
}
```

### Tool Chaining Patterns
Chain multiple tools together for complex workflows.

```typescript
// Chain tools in sequence with state passing
export async function chainedToolExecution(state: WorkflowState) {
  // Step 1: Design schema
  const designResult = await schemaDesignTool.invoke({
    operations: state.operations
  })
  
  if (!designResult.includes('successfully updated')) {
    throw new Error('Schema design failed')
  }
  
  // Step 2: Validate schema
  const validationResult = await validationTool.invoke({
    schema: state.currentSchema
  })
  
  if (!validationResult.includes('validation passed')) {
    throw new Error('Schema validation failed')
  }
  
  // Step 3: Generate tests
  const testResult = await testGenerationTool.invoke({
    schema: state.currentSchema,
    requirements: state.requirements
  })
  
  return {
    ...state,
    designComplete: true,
    validationPassed: true,
    testsGenerated: true,
    results: {
      design: designResult,
      validation: validationResult,
      tests: testResult
    }
  }
}

// Conditional tool chaining based on results
export async function conditionalToolChain(state: AgentState) {
  let currentState = { ...state }
  
  // Always start with validation
  const validationResult = await validationTool.invoke(currentState.data)
  currentState.validationResult = validationResult
  
  // Chain next tool based on validation result
  if (validationResult.success) {
    const optimizationResult = await optimizationTool.invoke(currentState.data)
    currentState.optimizationResult = optimizationResult
  } else {
    const repairResult = await repairTool.invoke({
      data: currentState.data,
      errors: validationResult.errors
    })
    currentState.repairResult = repairResult
  }
  
  return currentState
}
```
