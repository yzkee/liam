# Core Concepts

## Graph State Definition

### MessagesAnnotation Example

The `Annotation` function is the recommended way to define your graph state for new `StateGraph` graphs. Here's a basic example using messages:

```typescript
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

const GraphAnnotation = Annotation.Root({
  // Define a 'messages' channel to store an array of BaseMessage objects
  messages: Annotation<BaseMessage[]>({
    // Reducer function: Combines the current state with new messages
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    // Default function: Initialize the channel with an empty array
    default: () => [],
  }),
});
```

### Custom State with Annotation.Root

You can define custom state structures using `Annotation.Root` with multiple channels:

```typescript
const QuestionAnswerAnnotation = Annotation.Root({
  question: Annotation<string>(),
  answer: Annotation<string>(),
});
```

### State Reducers and Merging Strategies

Each channel can optionally have `reducer` and `default` functions. The `reducer` function defines how new values are combined with the existing state:

```typescript
const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
});
```

## Basic Graph Construction

### StateGraph Initialization

Finally, instantiating your graph using the annotations is as simple as passing the annotation to the `StateGraph` constructor:

```typescript
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph(GraphAnnotation);
```

### Adding Nodes and Edges

Once you have a `StateGraph` instance, you can add nodes and edges to define your workflow:

```typescript
// Add nodes to the graph
workflow.addNode("nodeA", nodeAFunction);
workflow.addNode("nodeB", nodeBFunction);

// Add edges between nodes
workflow.addEdge("nodeA", "nodeB");
```

### START and END Usage

LangGraph provides special `START` and `END` constants for defining entry and exit points:

```typescript
import { START, END } from "@langchain/langgraph";

// Connect START to your first node
workflow.addEdge(START, "nodeA");

// Connect your last node to END
workflow.addEdge("nodeB", END);
```

### Graph Compilation

After defining your graph structure, you need to compile it before execution:

```typescript
const app = workflow.compile();
```

## Node Implementation Patterns

### Simple Node Functions

Node functions receive the current state and return updates to that state:

```typescript
function simpleNode(state: typeof GraphAnnotation.State) {
  return {
    messages: [new HumanMessage("Hello from simple node")]
  };
}
```

### Async Nodes with External Calls

Nodes can be asynchronous and make external API calls:

```typescript
async function asyncNode(state: typeof GraphAnnotation.State) {
  // Make external API call
  const response = await fetch("https://api.example.com/data");
  const data = await response.json();
  
  return {
    messages: [new AIMessage(`Received data: ${JSON.stringify(data)}`)]
  };
}
```

### Error Handling in Nodes

Implement proper error handling within your node functions:

```typescript
async function nodeWithErrorHandling(state: typeof GraphAnnotation.State) {
  try {
    // Potentially failing operation
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

### State Update Patterns

Nodes should return partial state updates that will be merged with the existing state:

```typescript
function stateUpdateNode(state: typeof GraphAnnotation.State) {
  // Access current state
  const currentMessages = state.messages;
  
  // Return partial update
  return {
    messages: [new AIMessage(`Processed ${currentMessages.length} messages`)]
  };
}
```
