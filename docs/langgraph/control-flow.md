# Control Flow

## Branching for Parallel Execution

### Basic Parallel Branches

LangGraph supports fan-out and fan-in patterns for parallel execution. You can create branches that execute multiple nodes simultaneously:

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";

const workflow = new StateGraph(GraphAnnotation);

workflow.addNode("nodeA", nodeAFunction);
workflow.addNode("nodeB", nodeBFunction);
workflow.addNode("nodeC", nodeCFunction);
workflow.addNode("nodeD", nodeDFunction);

// Fan-out: START connects to multiple nodes
workflow.addEdge(START, "nodeA");
workflow.addEdge(START, "nodeB");

// Fan-in: Multiple nodes connect to one node
workflow.addEdge("nodeA", "nodeC");
workflow.addEdge("nodeB", "nodeC");

workflow.addEdge("nodeC", "nodeD");
workflow.addEdge("nodeD", END);
```

### Multiple Entry Points

Define multiple entry points for different execution paths:

```typescript
workflow.addEdge(START, "entryA");
workflow.addEdge(START, "entryB");
```

### Synchronized Execution

Use merge nodes to synchronize parallel execution branches with stable sorting:

```typescript
function mergeFunction(state: typeof GraphAnnotation.State) {
  return {
    messages: [new AIMessage("Merged parallel execution results")]
  };
}
```

### Conditional Branching

Implement conditional branching based on state values:

```typescript
function routingCondition(state: typeof GraphAnnotation.State) {
  if (state.messages.length > 5) {
    return "processLarge";
  } else {
    return "processSmall";
  }
}

workflow.addConditionalEdges(
  "router",
  routingCondition,
  {
    "processLarge": "largeProcessor",
    "processSmall": "smallProcessor"
  }
);
```

## Map-Reduce Pattern

### Map-Reduce Workflow Setup

Implement map-reduce patterns using the `Send` API for distributing work across parallel nodes:

```typescript
import { Send } from "@langchain/langgraph";

function mapFunction(state: typeof GraphAnnotation.State) {
  const items = state.items;
  return items.map((item, index) => 
    new Send("processItem", { item, index })
  );
}

workflow.addNode("map", mapFunction);
workflow.addNode("processItem", processItemFunction);
workflow.addNode("reduce", reduceFunction);

workflow.addConditionalEdges("map", mapFunction, ["processItem"]);
workflow.addEdge("processItem", "reduce");
```

### Parallel Task Processing

Each mapper node processes data independently with distributed state:

```typescript
function processItemFunction(state: typeof GraphAnnotation.State) {
  const { item, index } = state;
  const processedData = processItem(item);
  return { 
    processedResults: [{ index, data: processedData }]
  };
}
```

### Result Aggregation

The reducer node combines results from all mapper nodes:

```typescript
function reduceFunction(state: typeof GraphAnnotation.State) {
  const sortedResults = state.processedResults.sort((a, b) => a.index - b.index);
  const finalResult = sortedResults.map(r => r.data);
  return { 
    messages: [new AIMessage(`Final result: ${JSON.stringify(finalResult)}`)]
  };
}
```

## Conditional Routing

### Dynamic Routing Based on State

Use conditional edges to route execution based on state values:

```typescript
function routingCondition(state: typeof GraphAnnotation.State) {
  if (state.messages.length > 5) {
    return "processLarge";
  } else {
    return "processSmall";
  }
}

workflow.addConditionalEdges(
  "router",
  routingCondition,
  {
    "processLarge": "largeProcessor",
    "processSmall": "smallProcessor"
  }
);
```

### Complex Condition Evaluation

Implement complex routing logic with multiple conditions:

```typescript
function complexRoutingCondition(state: typeof GraphAnnotation.State) {
  const messageCount = state.messages.length;
  const hasErrors = state.messages.some(msg => msg.content.includes("error"));
  
  if (hasErrors) {
    return "errorHandler";
  } else if (messageCount > 10) {
    return "batchProcessor";
  } else {
    return "standardProcessor";
  }
}
```

### Fallback Routing Patterns

Always provide fallback routes for unexpected conditions:

```typescript
workflow.addConditionalEdges(
  "router",
  routingCondition,
  {
    "processLarge": "largeProcessor",
    "processSmall": "smallProcessor",
    "__default__": "fallbackProcessor"
  }
);
```

## Recursion Limits and Loop Control

### Recursion Limit Configuration

Configure recursion limits to prevent infinite loops using supersteps:

```typescript
const app = workflow.compile({
  recursionLimit: 100
});
```

### Loop Detection and Prevention

Implement conditional termination to control loops:

```typescript
function shouldContinue(state: typeof GraphAnnotation.State) {
  if (state.iterations >= 10) {
    return END;
  }
  return "continueLoop";
}

workflow.addConditionalEdges(
  "loopNode",
  shouldContinue,
  {
    "continueLoop": "loopNode",
    [END]: END
  }
);
```

### Graceful Loop Termination

Handle loop termination with proper state management:

```typescript
function terminationNode(state: typeof GraphAnnotation.State) {
  return {
    messages: [new AIMessage("Loop terminated gracefully")],
    completed: true,
    iterations: (state.iterations || 0) + 1
  };
}
```

## Command Pattern for Control Flow

### Using Command for Flow Control

Use the `Command` object to control execution flow and navigate between nodes:

```typescript
import { Command } from "@langchain/langgraph";

function commandNode(state: typeof GraphAnnotation.State) {
  if (state.shouldSkip) {
    return new Command({
      goto: "skipNode"
    });
  }
  
  return {
    messages: [new AIMessage("Processing normally")]
  };
}
```

### Combining State Updates with Routing

Commands can combine state updates with routing decisions:

```typescript
function commandWithStateUpdate(state: typeof GraphAnnotation.State) {
  const updatedState = {
    messages: [new AIMessage("State updated")],
    processedCount: (state.processedCount || 0) + 1
  };
  
  return new Command({
    update: updatedState,
    goto: "nextNode"
  });
}
```

### Advanced Command Patterns

Use commands for complex control flow scenarios including navigation to parent graphs:

```typescript
function advancedCommandNode(state: typeof GraphAnnotation.State) {
  if (state.error) {
    return new Command({
      update: { errorHandled: true },
      goto: "errorRecovery"
    });
  }
  
  if (state.completed) {
    return new Command({
      goto: END
    });
  }
  
  return new Command({
    update: { step: (state.step || 0) + 1 },
    goto: "continueProcessing"
  });
}
```

### Deferred Node Execution

Defer node execution until all other pending tasks are completed:

```typescript
workflow.addNode("deferredNode", deferredFunction, {
  defer: true
});
```

## References

For more detailed information and advanced usage patterns, refer to the official LangGraphJS documentation:

### Branching and Parallel Execution
- [How to create branches for parallel execution](https://langchain-ai.github.io/langgraphjs/how-tos/branching/) - Complete guide to fan-out/fan-in patterns and conditional branching

### Map-Reduce Pattern
- [How to create map-reduce branches for parallel execution](https://langchain-ai.github.io/langgraphjs/how-tos/map-reduce/) - Implementing map-reduce workflows with the Send API

### Recursion and Loop Control
- [How to create and control loops with recursion limits](https://langchain-ai.github.io/langgraphjs/how-tos/recursion-limit/) - Managing recursion limits and preventing infinite loops

### Command Pattern for Control Flow
- [How to combine control flow and state updates with Command](https://langchain-ai.github.io/langgraphjs/how-tos/command/) - Using Command objects for advanced flow control

### Additional Control Flow
- [How to defer node execution](https://langchain-ai.github.io/langgraphjs/how-tos/defer-node-execution/) - Deferring execution until other pending tasks complete
