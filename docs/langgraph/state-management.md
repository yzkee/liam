# State Management

## State Schema Design

### Using Annotation for State Definition

The `Annotation` function is the recommended way to define your graph state for new `StateGraph` graphs. The `Annotation.Root` function creates the top-level state object:

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

### Input/Output Schema Separation

Define separate input and output schemas for your graph using different annotation objects:

```typescript
const InputAnnotation = Annotation.Root({
  question: Annotation<string>(),
});

const OutputAnnotation = Annotation.Root({
  answer: Annotation<string>(),
});

const GraphAnnotation = Annotation.Root({
  ...InputAnnotation.spec,
  ...OutputAnnotation.spec,
});
```

### Private vs Public State

Pass private state between nodes using input annotations that are not part of the main graph state:

```typescript
const PrivateAnnotation = Annotation.Root({
  privateData: Annotation<string>(),
});

function nodeWithPrivateState(
  state: typeof GraphAnnotation.State,
  config: { configurable: { privateInput: typeof PrivateAnnotation.State } }
) {
  const privateData = config.configurable.privateInput.privateData;
  return {
    answer: `Processed: ${privateData}`
  };
}
```

### Nested State Structures

Merge multiple annotations using the `spec` property:

```typescript
const UserAnnotation = Annotation.Root({
  userId: Annotation<string>(),
  userName: Annotation<string>(),
});

const SessionAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  timestamp: Annotation<number>(),
});

const CombinedAnnotation = Annotation.Root({
  ...UserAnnotation.spec,
  ...SessionAnnotation.spec,
  messages: Annotation<BaseMessage[]>({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
});
```

## State Updates and Merging

### Custom Reducers

Define custom reducer functions to control how state updates are merged:

```typescript
const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
  counter: Annotation<number>({
    reducer: (currentState, updateValue) => currentState + updateValue,
    default: () => 0,
  }),
});
```

### State Validation

Ensure type safety by passing the annotation to the `StateGraph` constructor:

```typescript
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph(GraphAnnotation);
```

### Partial Updates

Return partial state updates from nodes that will be merged with existing state:

```typescript
function updateNode(state: typeof GraphAnnotation.State) {
  return {
    counter: 1,
    messages: [new AIMessage("Counter incremented")]
  };
}
```

### Updating State from Tools

Use the `Command` object to update graph state from tools:

```typescript
import { Command } from "@langchain/langgraph";

const lookupUserInfo = tool(async (input, config) => {
  const userInfo = await getUserInfo(input.userId);
  
  return new Command({
    update: {
      userInfo: userInfo,
      messages: [
        new ToolMessage({
          content: `Successfully looked up user information`,
          tool_call_id: config.tool_call_id,
        }),
      ],
    },
  });
}, {
  name: "lookup_user_info",
  description: "Use this to look up user information",
  schema: z.object({
    userId: z.string(),
  }),
});
```

## State Persistence Patterns

### Thread-level Persistence

Add thread-level persistence using checkpointers:

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });
```

### Cross-thread Persistence

Implement cross-thread persistence using the `Store` interface:

```typescript
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();
const graph = workflow.compile({ 
  checkpointer,
  store 
});

// Access store in nodes
function nodeWithStore(
  state: typeof GraphAnnotation.State,
  config: { store: InMemoryStore }
) {
  const userMemory = await config.store.get(
    ["users", state.userId], 
    "memory"
  );
  
  return {
    messages: [new AIMessage(`Retrieved memory: ${userMemory}`)]
  };
}
```

### PostgreSQL Persistence

Use PostgreSQL for production persistence:

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString("postgresql://...");
const graph = workflow.compile({ checkpointer });
```

### State Editing

Edit graph state using breakpoints and `updateState`:

```typescript
const graph = workflow.compile({ 
  checkpointer,
  interruptBefore: ["nodeA"] 
});

// Run until breakpoint
const result = await graph.invoke(
  { messages: [new HumanMessage("Hello")] },
  { configurable: { thread_id: "1" } }
);

// Update state at breakpoint
await graph.updateState(
  { configurable: { thread_id: "1" } },
  { messages: [new AIMessage("Updated message")] }
);

// Resume execution
const finalResult = await graph.invoke(
  null,
  { configurable: { thread_id: "1" } }
);
```

### Subgraph State Management

Manage state in subgraphs with persistence:

```typescript
const subgraph = new StateGraph(SubgraphAnnotation)
  .addNode("subNode", subNodeFunction)
  .addEdge(START, "subNode")
  .addEdge("subNode", END)
  .compile({ checkpointer });

// Add subgraph to main graph
workflow.addNode("subgraphNode", subgraph);

// View and update subgraph state
const subgraphState = await subgraph.getState({
  configurable: { thread_id: "subgraph-1" }
});

await subgraph.updateState(
  { configurable: { thread_id: "subgraph-1" } },
  { subgraphData: "updated" }
);
```
