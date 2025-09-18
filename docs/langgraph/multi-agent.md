# Multi-agent Systems

## How to build a multi-agent network (functional API)

In this how-to guide we will demonstrate how to implement a multi-agent network architecture where each agent can communicate with every other agent (many-to-many connections) and can decide which agent to call next. We will be using LangGraph's functional API — individual agents will be defined as tasks and the agent handoffs will be defined in the main entrypoint.

```typescript
import { entrypoint, task } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Define a tool to signal intent to hand off to a different agent
const transferToHotelAdvisor = tool(
  async () => {
    return "Successfully transferred to hotel_advisor.";
  },
  {
    name: "transferToHotelAdvisor",
    description: "Ask hotel advisor agent for help.",
    schema: z.object({}),
    returnDirect: true,
  }
);

const transferToRestaurantAdvisor = tool(
  async () => {
    return "Successfully transferred to restaurant_advisor.";
  },
  {
    name: "transferToRestaurantAdvisor", 
    description: "Ask restaurant advisor agent for help.",
    schema: z.object({}),
    returnDirect: true,
  }
);

// Create individual agents
const hotelAdvisorAgent = createReactAgent({
  llm: model,
  tools: [transferToRestaurantAdvisor],
  stateModifier: "You are a hotel advisor agent. Help users find hotels.",
});

const restaurantAdvisorAgent = createReactAgent({
  llm: model,
  tools: [transferToHotelAdvisor],
  stateModifier: "You are a restaurant advisor agent. Help users find restaurants.",
});

// Define tasks for each agent
const hotelAdvisorTask = task(hotelAdvisorAgent, "hotel_advisor");
const restaurantAdvisorTask = task(restaurantAdvisorAgent, "restaurant_advisor");

// Main entrypoint that routes to appropriate agent
const mainEntrypoint = entrypoint({
  name: "travel_assistant",
  description: "A travel assistant that can help with hotels and restaurants",
  tasks: [hotelAdvisorTask, restaurantAdvisorTask],
  defaultTask: hotelAdvisorTask,
});

// Usage
const result = await mainEntrypoint.invoke({
  messages: [{ role: "user", content: "I need help planning my trip" }]
});
```

## How to add multi-turn conversation in a multi-agent application (functional API)

In this how-to guide, we'll build an application that allows an end-user to engage in a multi-turn conversation with one or more agents. We'll create a node that uses an `interrupt` to collect user input and routes back to the active agent.

The agents will be implemented as tasks in a workflow that executes agent steps and determines the next action:

1. **Wait for user input** to continue the conversation, or
2. **Route to another agent** (or back to itself, such as in a loop) via a handoff.

```typescript
import { entrypoint, task, interrupt } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Define tools for agent handoffs
const transferToTravelAdvisor = tool(
  async () => {
    return "Successfully transferred to travel_advisor.";
  },
  {
    name: "transferToTravelAdvisor",
    description: "Transfer to travel advisor for trip planning help.",
    schema: z.object({}),
    returnDirect: true,
  }
);

const transferToHotelAdvisor = tool(
  async () => {
    return "Successfully transferred to hotel_advisor.";
  },
  {
    name: "transferToHotelAdvisor",
    description: "Transfer to hotel advisor for accommodation help.",
    schema: z.object({}),
    returnDirect: true,
  }
);

// Create agents
const travelAdvisor = createReactAgent({
  llm: model,
  tools: [transferToHotelAdvisor],
  stateModifier: "You are a travel advisor. Help users plan their trips.",
});

const hotelAdvisor = createReactAgent({
  llm: model,
  tools: [transferToTravelAdvisor],
  stateModifier: "You are a hotel advisor. Help users find accommodations.",
});

// Define tasks
const travelAdvisorTask = task(travelAdvisor, "travel_advisor");
const hotelAdvisorTask = task(hotelAdvisor, "hotel_advisor");

// Create entrypoint
const multiTurnEntrypoint = entrypoint({
  name: "multi_turn_assistant",
  description: "A multi-turn travel assistant",
  tasks: [travelAdvisorTask, hotelAdvisorTask],
  defaultTask: travelAdvisorTask,
});

// Test multi-turn conversation
const config = { configurable: { thread_id: "conversation_1" } };

let result = await multiTurnEntrypoint.invoke({
  messages: [{ role: "user", content: "I want to plan a trip to Paris" }]
}, config);

// Continue the conversation
while (true) {
  const userInput = await interrupt("Please provide your next message:");
  
  result = await multiTurnEntrypoint.invoke({
    messages: [{ role: "user", content: userInput }]
  }, config);
  
  console.log("Assistant:", result.messages[result.messages.length - 1].content);
}
```

## How to manage conversation history

When building chatbots, one of the most important considerations is how to manage conversation history. Too much history can distract the model, while too little history can make the conversation feel impersonal.

```typescript
import { StateGraph, Annotation, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

// Define state
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// Filter messages to keep only the most recent
const filterMessages = (messages: BaseMessage[]) => {
  return messages.slice(-1); // Keep only the last message
};

// Agent node that uses filtered messages
const agent = async (state: typeof AgentState.State) => {
  const { messages } = state;
  const filteredMessages = filterMessages(messages);
  
  const response = await model.invoke(filteredMessages);
  
  return {
    messages: [response],
  };
};

// Build workflow
const workflow = new StateGraph(AgentState)
  .addNode("agent", agent)
  .addEdge(START, "agent");

const app = workflow.compile();
```

## How to add and use subgraphs

Subgraphs allow you to build complex systems with multiple components that are themselves graphs. A common use case for using subgraphs is building multi-agent systems.

### Add a node with the compiled subgraph

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";

const SubgraphStateAnnotation = Annotation.Root({
  foo: Annotation<string>, // note that this key is shared with the parent graph state
  bar: Annotation<string>,
});

const subgraphNode1 = async (state: typeof SubgraphStateAnnotation.State) => {
  return { bar: "bar" };
};

const subgraphNode2 = async (state: typeof SubgraphStateAnnotation.State) => {
  // note that this node is using a state key ('bar') that is only available in the subgraph
  // and is sending update on the shared state key ('foo')
  return { foo: state.foo + state.bar };
};

const subgraphBuilder = new StateGraph(SubgraphStateAnnotation)
  .addNode("subgraphNode1", subgraphNode1)
  .addNode("subgraphNode2", subgraphNode2)
  .addEdge("__start__", "subgraphNode1")
  .addEdge("subgraphNode1", "subgraphNode2");

const subgraph = subgraphBuilder.compile();

// Define parent graph
const ParentStateAnnotation = Annotation.Root({
  foo: Annotation<string>,
});

const node1 = async (state: typeof ParentStateAnnotation.State) => {
  return {
    foo: "hi! " + state.foo,
  };
};

const builder = new StateGraph(ParentStateAnnotation)
  .addNode("node1", node1)
  // note that we're adding the compiled subgraph as a node to the parent graph
  .addNode("node2", subgraph)
  .addEdge("__start__", "node1")
  .addEdge("node1", "node2");

const graph = builder.compile();
```

### Add a node function that invokes the subgraph

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";

const SubgraphAnnotation = Annotation.Root({
  bar: Annotation<string>, // note that this key is shared with the parent graph state
  baz: Annotation<string>,
});

const subgraphNodeOne = async (state: typeof SubgraphAnnotation.State) => {
  return { baz: "baz" };
};

const subgraphNodeTwo = async (state: typeof SubgraphAnnotation.State) => {
  return { bar: state.bar + state.baz };
};

const subgraphCalledInFunction = new StateGraph(SubgraphAnnotation)
  .addNode("subgraphNode1", subgraphNodeOne)
  .addNode("subgraphNode2", subgraphNodeTwo)
  .addEdge("__start__", "subgraphNode1")
  .addEdge("subgraphNode1", "subgraphNode2")
  .compile();

// Define parent graph
const ParentAnnotation = Annotation.Root({
  foo: Annotation<string>,
});

const nodeOne = async (state: typeof ParentAnnotation.State) => {
  return {
    foo: "hi! " + state.foo,
  };
};

const nodeTwo = async (state: typeof ParentAnnotation.State) => {
  const response = await subgraphCalledInFunction.invoke({
    bar: state.foo,
  });
  return { foo: response.bar };
};

const graphWithFunction = new StateGraph(ParentStateAnnotation)
  .addNode("node1", nodeOne)
  // note that we're adding the compiled subgraph as a node to the parent graph
  .addNode("node2", nodeTwo)
  .addEdge("__start__", "node1")
  .addEdge("node1", "node2")
  .compile();
```

## Related Links

For more detailed information, refer to the official LangGraph.js documentation:

### Multi-agent Systems
- [How to build a multi-agent network (functional API)](https://langchain-ai.github.io/langgraphjs/how-tos/multi-agent-network-functional/)
- [How to add multi-turn conversation in a multi-agent application (functional API)](https://langchain-ai.github.io/langgraphjs/how-tos/multi-agent-multi-turn-convo-functional/)

### Related Features
- [How to manage conversation history](https://langchain-ai.github.io/langgraphjs/how-tos/manage-conversation-history/)
- [How to add and use subgraphs](https://langchain-ai.github.io/langgraphjs/how-tos/subgraph/)
