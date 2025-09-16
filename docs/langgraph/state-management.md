# State Management

## State Schema Design

### Using Annotation for State Definition

The `Annotation` function is the recommended way to define your graph state for new `StateGraph` graphs. The `Annotation.Root` function is used to create the top-level state object, where each field represents a channel in the graph.

```typescript
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

const GraphAnnotation = Annotation.Root({
  // Define a 'messages' channel to store an array of BaseMessage objects
  messages: Annotation<BaseMessage[]>({
    // Reducer function: Combines the current state with new messages
    // Default function: Initialize the channel with an empty array
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),
});
```

### Input/Output Schema Separation

Each channel can optionally have `reducer` and `default` functions. The `reducer` function defines how new values are combined with the existing state. The `default` function provides an initial value for the channel.

```typescript
const QuestionAnswerAnnotation = Annotation.Root({
  question: Annotation<string>(),
  answer: Annotation<string>(),
});
```

### Private vs Public State

Above, all we're doing is defining the channels, and then passing the un-instantiated `Annotation` function as the value. It is important to note we always pass in the TypeScript type of each channel as the first generics argument to `Annotation`. Doing this ensures our graph state is type safe, and we can get the proper types when defining our nodes.

```typescript
type QuestionAnswerAnnotationType = typeof QuestionAnswerAnnotation.State;

// This is equivalent to the following type:
type QuestionAnswerAnnotationType = {
  question: string;
  answer: string;
}
```

### Nested State Structures

If you have two graph state annotations, you can merge the two into a single annotation by using the `spec` value:

```typescript
const MergedAnnotation = Annotation.Root({
  ...QuestionAnswerAnnotation.spec,
  ...GraphAnnotation.spec,
});
```

The type of the merged annotation is the intersection of the two annotations:

```typescript
type MergedAnnotationType = {
  messages: BaseMessage[];
  question: string;
  answer: string;
}
```

## State Updates and Merging

### Custom Reducers

The `Annotation` function is a convenience wrapper around the low level implementation of how states are defined in LangGraph. Defining state using the `channels` object (which is what `Annotation` is a wrapper of) is still possible, although not recommended for most cases.

```typescript
import { StateGraph } from "@langchain/langgraph";

interface WorkflowChannelsState {
  messages: BaseMessage[];
  question: string;
  answer: string;
}

const workflowWithChannels = new StateGraph<WorkflowChannelsState>({
  channels: {
    messages: {
      reducer: (currentState, updateValue) => currentState.concat(updateValue),
      default: () => [],
    },
  }
});
```

### State Validation

Finally, instantiating your graph using the annotations is as simple as passing the annotation to the `StateGraph` constructor:

```typescript
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph(MergedAnnotation);
```

### Partial Updates

Each channel can optionally have `reducer` and `default` functions. The `reducer` function defines how new values are combined with the existing state. The `default` function provides an initial value for the channel.

For more information on reducers, see the [reducers conceptual guide](https://langchain-ai.github.io/langgraphjs/concepts/low_level/#reducers).

## State Persistence Patterns

### Stateful vs Stateless Nodes

The `Annotation` function is a convenience wrapper around the low level implementation of how states are defined in LangGraph. Defining state using the `channels` object provides more control over state management patterns.

### Cross-invocation State

When defining state channels, you can specify how state persists across different invocations of your graph. The reducer functions determine how new state updates are merged with existing state.

### State Cleanup Strategies

State channels can be configured with default values and reducer functions that handle state initialization and cleanup. The `default` function provides initial values, while reducer functions control how state is updated and maintained throughout the graph execution.
