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


### Nested State Structures

Merge multiple annotations using the `spec` property for complex state structures.

## State Updates and Merging

### Custom Reducers

Define custom reducer functions to control how state updates are merged with `reducer` and `default` functions.

### State Validation

Ensure type safety by passing the annotation to the `StateGraph` constructor:

```typescript
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph(GraphAnnotation);
```

### Partial Updates

Return partial state updates from nodes that will be merged with existing state.

### Updating State from Tools

Use the `Command` object with the `update` parameter to update graph state from tool calls.

## State Persistence Patterns

### Thread-level Persistence

Add thread-level persistence using checkpointers:

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });
```

### Cross-thread Persistence

Implement cross-thread persistence using the `Store` interface with namespaces for data organization.

### PostgreSQL Persistence

Use PostgreSQL for production persistence:

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString("postgresql://...");
const graph = workflow.compile({ checkpointer });
```

### State Editing

Edit graph state using breakpoints with `interruptBefore` and `updateState` method for state modifications.

### Subgraph State Management

Manage state in subgraphs with persistence using `getState` and `updateState` methods for nested configurations.

## References

For more detailed information and advanced usage patterns, refer to the official LangGraphJS documentation:

### State Schema Design
- [How to define graph state](https://langchain-ai.github.io/langgraphjs/how-tos/define-state/) - Complete guide to state definition with Annotation.Root and custom reducers
- [Have a separate input and output schema](https://langchain-ai.github.io/langgraphjs/how-tos/input_output_schema/) - Separating input/output schemas for better type safety
- [Pass private state between nodes inside the graph](https://langchain-ai.github.io/langgraphjs/how-tos/pass_private_state/) - Managing private state between nodes

### State Updates and Merging
- [How to update graph state from tools](https://langchain-ai.github.io/langgraphjs/how-tos/update-state-from-tools/) - Using Command objects to update state from tool calls

### State Persistence Patterns
- [How to add thread-level persistence to your graph](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/) - Basic persistence with checkpointers like MemorySaver
- [How to add cross-thread persistence](https://langchain-ai.github.io/langgraphjs/how-tos/cross-thread-persistence/) - Cross-thread persistence using Store interface
- [How to use a Postgres checkpointer for persistence](https://langchain-ai.github.io/langgraphjs/how-tos/persistence-postgres/) - Production-ready PostgreSQL persistence
- [How to edit graph state](https://langchain-ai.github.io/langgraphjs/how-tos/edit-graph-state/) - Editing state with breakpoints and updateState
- [How to view and update state in subgraphs](https://langchain-ai.github.io/langgraphjs/how-tos/subgraphs-manage-state/) - Managing state in nested subgraph configurations
