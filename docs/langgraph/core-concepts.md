# Core Concepts

## Graph State Definition

### MessagesAnnotation Example

The `Annotation` function is the recommended way to define your graph state for new `StateGraph` graphs. Here's a basic example using messages:

```typescript
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
});
```

### Custom State with Annotation.Root

You can define custom state structures using `Annotation.Root` with multiple channels. Each channel can optionally have `reducer` and `default` functions:

```typescript
const QuestionAnswerAnnotation = Annotation.Root({
  question: Annotation<string>(),
  answer: Annotation<string>(),
});
```

### State Reducers and Merging Strategies

The `reducer` function defines how new values are combined with the existing state. The `default` function provides an initial value for the channel:

```typescript
const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
});
```

You can merge multiple annotations using the `spec` property:

```typescript
const MergedAnnotation = Annotation.Root({
  ...QuestionAnswerAnnotation.spec,
  ...GraphAnnotation.spec,
});
```

## Basic Graph Construction

### StateGraph Initialization

Instantiate your graph by passing the annotation to the `StateGraph` constructor:

```typescript
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph(GraphAnnotation);
```

### Adding Nodes and Edges

Add nodes and edges to define your workflow structure:

```typescript
workflow.addNode("nodeA", nodeAFunction);
workflow.addNode("nodeB", nodeBFunction);
workflow.addEdge("nodeA", "nodeB");
```

### START and END Usage

Use special `START` and `END` constants for entry and exit points:

```typescript
import { START, END } from "@langchain/langgraph";

workflow.addEdge(START, "nodeA");
workflow.addEdge("nodeB", END);
```

### Graph Compilation

Compile the graph before execution:

```typescript
const app = workflow.compile();
```

## Node Implementation Patterns

### Simple Node Functions

Node functions receive the current state and return updates:

```typescript
function simpleNode(state: typeof GraphAnnotation.State) {
  return {
    messages: [new HumanMessage("Hello from simple node")]
  };
}
```

### Async Nodes with External Calls

Nodes can be asynchronous for external API calls:

```typescript
async function asyncNode(state: typeof GraphAnnotation.State) {
  const response = await fetch("https://api.example.com/data");
  const data = await response.json();
  
  return {
    messages: [new AIMessage(`Received data: ${JSON.stringify(data)}`)]
  };
}
```

### Error Handling in Nodes

Implement proper error handling patterns:

```typescript
async function nodeWithErrorHandling(state: typeof GraphAnnotation.State) {
  try {
    const result = await riskyOperation();
    return {
      messages: [new AIMessage(`Success: ${result}`)]
    };
  } catch (error) {
    return {
      messages: [new AIMessage(`Error occurred: ${error.message}`)]
    };
  }
}
```

### Node Retry Policies

Configure retry policies for nodes that may fail:

```typescript
workflow.addNode("retryableNode", retryableFunction, {
  retryPolicy: {
    initialInterval: 1000,
    backoffFactor: 2,
    maxInterval: 10000,
    maxAttempts: 3,
  },
});
```

### Node Caching

Cache expensive node operations with TTL configuration:

```typescript
workflow.addNode("expensiveNode", expensiveFunction, {
  cachePolicy: {
    ttl: 300,
    keySerializer: (state) => JSON.stringify(state.input),
  },
});
```

### Deferred Node Execution

Defer node execution until all other pending tasks complete:

```typescript
workflow.addNode("deferredNode", deferredFunction, {
  defer: true,
});
```
