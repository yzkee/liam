# Control Flow

## Branching for Parallel Execution

### Basic Parallel Branches

LangGraph supports parallel execution through branching patterns. You can create branches that execute multiple nodes simultaneously:

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";

const workflow = new StateGraph(GraphAnnotation);

// Add parallel nodes
workflow.addNode("branchA", branchAFunction);
workflow.addNode("branchB", branchBFunction);
workflow.addNode("merge", mergeFunction);

// Create parallel branches from START
workflow.addEdge(START, "branchA");
workflow.addEdge(START, "branchB");

// Merge results
workflow.addEdge("branchA", "merge");
workflow.addEdge("branchB", "merge");
workflow.addEdge("merge", END);
```

### Multiple Entry Points

You can define multiple entry points for different execution paths:

```typescript
// Multiple starting nodes
workflow.addEdge(START, "entryA");
workflow.addEdge(START, "entryB");
```

### Synchronized Execution

Use merge nodes to synchronize parallel execution branches before continuing:

```typescript
function mergeFunction(state: typeof GraphAnnotation.State) {
  // Combine results from parallel branches
  return {
    messages: [new AIMessage("Merged parallel execution results")]
  };
}
```

## Map-Reduce Pattern

### Map-Reduce Workflow Setup

Implement map-reduce patterns by distributing work across parallel nodes and aggregating results:

```typescript
const mapReduceWorkflow = new StateGraph(GraphAnnotation);

// Map phase - parallel processing
mapReduceWorkflow.addNode("mapper1", mapperFunction1);
mapReduceWorkflow.addNode("mapper2", mapperFunction2);
mapReduceWorkflow.addNode("mapper3", mapperFunction3);

// Reduce phase - aggregation
mapReduceWorkflow.addNode("reducer", reducerFunction);
```

### Parallel Task Processing

Each mapper node processes a portion of the data independently:

```typescript
function mapperFunction1(state: typeof GraphAnnotation.State) {
  // Process subset of data
  const processedData = processDataSubset(state.data, 0, 100);
  return { processedResults: processedData };
}
```

### Result Aggregation

The reducer node combines results from all mapper nodes:

```typescript
function reducerFunction(state: typeof GraphAnnotation.State) {
  // Aggregate all processed results
  const finalResult = aggregateResults(state.processedResults);
  return { 
    messages: [new AIMessage(`Final result: ${finalResult}`)]
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
    "__default__": "fallbackProcessor"  // Fallback route
  }
);
```

## Recursion Limits and Loop Control

### Recursion Limit Configuration

Configure recursion limits to prevent infinite loops:

```typescript
const app = workflow.compile({
  recursionLimit: 100  // Maximum number of steps
});
```

### Loop Detection and Prevention

Implement loop detection in your routing logic:

```typescript
function loopAwareRouting(state: typeof GraphAnnotation.State) {
  // Track visited nodes to prevent loops
  const visitedNodes = state.visitedNodes || [];
  const currentNode = "processingNode";
  
  if (visitedNodes.includes(currentNode)) {
    return "exitLoop";  // Break the loop
  }
  
  return "continueProcessing";
}
```

### Graceful Loop Termination

Handle loop termination gracefully:

```typescript
function terminationNode(state: typeof GraphAnnotation.State) {
  return {
    messages: [new AIMessage("Loop terminated gracefully")],
    completed: true
  };
}
```

## Command Pattern for Control Flow

### Using Command for Flow Control

The Command pattern can be used to control flow execution:

```typescript
import { Command } from "@langchain/langgraph";

function commandNode(state: typeof GraphAnnotation.State) {
  // Use Command to control execution flow
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

Use commands for complex control flow scenarios:

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
