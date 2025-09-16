# Streaming

LangGraph provides multiple streaming modes to handle real-time data flow and provide responsive user experiences. This guide covers the different streaming approaches available in LangGraph.js.

## Stream Modes

### Stream Values Mode
Stream the full state of the graph after each node execution. This mode provides complete state snapshots at each step.

```typescript
import { StateGraph } from '@langchain/langgraph'

const graph = new StateGraph(annotation)
  .addNode('node1', node1Function)
  .addNode('node2', node2Function)
  .addEdge('node1', 'node2')
  .compile()

// Stream values - get full state after each node
for await (const chunk of await graph.stream(
  { input: "Hello" },
  { streamMode: "values" }
)) {
  console.log("Full state:", chunk)
}
```

### Stream Updates Mode
Stream only the updates/changes made by each node, providing incremental state changes.

```typescript
// Stream updates - get only the changes from each node
for await (const chunk of await graph.stream(
  { input: "Hello" },
  { streamMode: "updates" }
)) {
  console.log("Node updates:", chunk)
}
```

### Stream Messages Mode
Stream individual messages as they are processed, useful for chat-based applications.

```typescript
// Stream messages - get individual messages as they flow through
for await (const chunk of await graph.stream(
  { messages: [{ role: "user", content: "Hello" }] },
  { streamMode: "messages" }
)) {
  console.log("Message chunk:", chunk)
}
```

### Multiple Streaming Modes
You can combine multiple streaming modes to get different perspectives on the execution.

```typescript
// Combine multiple stream modes
for await (const chunk of await graph.stream(
  { input: "Hello" },
  { streamMode: ["values", "updates"] }
)) {
  console.log("Combined stream:", chunk)
}
```

## Token-level Streaming

### LLM Token Streaming
Stream individual tokens from language model responses for real-time text generation.

```typescript
import { streamLLMResponse } from '../utils/streamingLlmUtils'
import { SSE_EVENTS } from '../streaming/constants'

// Stream LLM tokens with custom event dispatching
export async function streamLLMTokens(
  stream: AsyncIterable<AIMessageChunk>,
  agentName: string
): Promise<AIMessage> {
  return await streamLLMResponse(stream, {
    agentName,
    eventType: SSE_EVENTS.MESSAGES
  })
}
```

### Non-LangChain Model Streaming
Handle streaming from custom or non-LangChain language models.

```typescript
// Custom streaming implementation for non-LangChain models
async function streamCustomModel(prompt: string) {
  const stream = await customModel.stream(prompt)
  
  for await (const chunk of stream) {
    // Process and dispatch custom chunks
    await dispatchCustomEvent('custom_token', {
      content: chunk.text,
      id: crypto.randomUUID()
    })
  }
}
```

### Custom Token Handling
Implement custom logic for processing and accumulating streaming tokens.

```typescript
// Custom token accumulation and processing
let accumulatedContent = ""
const chunks: AIMessageChunk[] = []

for await (const chunk of stream) {
  // Accumulate content
  accumulatedContent += chunk.content
  chunks.push(chunk)
  
  // Custom processing logic
  if (shouldDispatchChunk(chunk)) {
    await dispatchCustomEvent('token_update', {
      content: accumulatedContent,
      partial: true
    })
  }
}
```

## Custom Data Streaming

### Custom Event Streaming
Dispatch custom events during graph execution for specialized use cases.

```typescript
import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch'

// Custom event streaming in nodes
export async function customStreamingNode(state: WorkflowState) {
  // Dispatch progress events
  await dispatchCustomEvent('progress_update', {
    step: 'processing',
    progress: 0.5,
    message: 'Processing schema design...'
  })
  
  // Perform work
  const result = await processData(state)
  
  // Dispatch completion event
  await dispatchCustomEvent('step_complete', {
    step: 'processing',
    result: result.summary
  })
  
  return result
}
```

### Progress Indicators
Stream progress information for long-running operations.

```typescript
// Progress tracking during schema operations
export async function trackSchemaProgress(operations: Operation[]) {
  const total = operations.length
  
  for (let i = 0; i < operations.length; i++) {
    await dispatchCustomEvent('schema_progress', {
      current: i + 1,
      total,
      percentage: ((i + 1) / total) * 100,
      operation: operations[i].type
    })
    
    await executeOperation(operations[i])
  }
}
```

### Real-time Updates
Provide real-time updates for collaborative features and live data.

```typescript
// Real-time collaboration updates
export async function streamCollaborationUpdates(sessionId: string) {
  const updates = await getRealtimeUpdates(sessionId)
  
  for await (const update of updates) {
    await dispatchCustomEvent('collaboration_update', {
      sessionId,
      userId: update.userId,
      action: update.action,
      timestamp: update.timestamp
    })
  }
}
```

## Streaming from Tools and Nodes

### Tool Execution Streaming
Stream progress and results from tool executions within nodes.

```typescript
// Stream tool execution progress
export async function streamingToolNode(state: DbAgentState) {
  await dispatchCustomEvent('tool_start', {
    toolName: 'schemaDesignTool',
    input: state.operations
  })
  
  try {
    const result = await schemaDesignTool.invoke(
      { operations: state.operations },
      { configurable: getToolConfigurable() }
    )
    
    await dispatchCustomEvent('tool_success', {
      toolName: 'schemaDesignTool',
      result: result
    })
    
    return { ...state, toolResult: result }
  } catch (error) {
    await dispatchCustomEvent('tool_error', {
      toolName: 'schemaDesignTool',
      error: error.message
    })
    throw error
  }
}
```

### Node Progress Streaming
Track and stream progress through individual graph nodes.

```typescript
// Node execution progress streaming
export async function progressTrackingNode(state: WorkflowState) {
  const steps = ['validate', 'process', 'save']
  
  for (const step of steps) {
    await dispatchCustomEvent('node_progress', {
      node: 'designSchema',
      step,
      status: 'started'
    })
    
    await executeStep(step, state)
    
    await dispatchCustomEvent('node_progress', {
      node: 'designSchema',
      step,
      status: 'completed'
    })
  }
  
  return state
}
```

### Event Dispatching
Implement comprehensive event dispatching for monitoring and debugging.

```typescript
// Comprehensive event dispatching system
export class StreamingEventDispatcher {
  async dispatchNodeStart(nodeName: string, input: any) {
    await dispatchCustomEvent('node_start', {
      node: nodeName,
      input,
      timestamp: new Date().toISOString()
    })
  }
  
  async dispatchNodeComplete(nodeName: string, output: any) {
    await dispatchCustomEvent('node_complete', {
      node: nodeName,
      output,
      timestamp: new Date().toISOString()
    })
  }
  
  async dispatchError(context: string, error: Error) {
    await dispatchCustomEvent('execution_error', {
      context,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }
}
```
