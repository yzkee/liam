# Multi-agent Systems

Multi-agent systems in LangGraph allow you to create complex workflows where multiple specialized agents collaborate to solve problems. This guide covers the patterns and techniques for implementing multi-agent architectures based on the official documentation.

## Agent Communication Patterns & Supervisory Patterns & Multi-turn Conversations

### How to build a multi-agent network (functional API)

Build a multi-agent network architecture where each agent can communicate with every other agent (many-to-many connections) and can decide which agent to call next using LangGraph's functional API.

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

### How to add multi-turn conversation in a multi-agent application (functional API)

Implement multi-turn conversations where agents can maintain context and hand off conversations seamlessly.

```typescript
import { entrypoint, task } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

// Create memory saver for conversation persistence
const memory = new MemorySaver();

// Define specialized agents with conversation context
const travelPlannerAgent = createReactAgent({
  llm: model,
  tools: [transferToHotelAdvisor, transferToRestaurantAdvisor],
  stateModifier: `You are a travel planner. You help users plan their trips by:
  1. Understanding their travel preferences
  2. Coordinating with hotel and restaurant advisors
  3. Creating comprehensive travel itineraries
  
  Maintain conversation context and remember user preferences throughout the conversation.`,
});

const hotelSpecialistAgent = createReactAgent({
  llm: model,
  tools: [transferToTravelPlanner, transferToRestaurantAdvisor],
  stateModifier: `You are a hotel specialist. You help users find the perfect accommodations by:
  1. Understanding their budget and preferences
  2. Recommending suitable hotels
  3. Providing booking assistance
  
  Remember previous conversation context when making recommendations.`,
});

// Define tasks with conversation memory
const travelPlannerTask = task(travelPlannerAgent, "travel_planner");
const hotelSpecialistTask = task(hotelSpecialistAgent, "hotel_specialist");

// Multi-turn conversation entrypoint
const conversationalTravelAssistant = entrypoint({
  name: "conversational_travel_assistant",
  description: "A conversational travel assistant that maintains context across multiple turns",
  tasks: [travelPlannerTask, hotelSpecialistTask],
  defaultTask: travelPlannerTask,
});

// Compile with memory for conversation persistence
const app = conversationalTravelAssistant.compile({
  checkpointer: memory,
});

// Multi-turn conversation example
const config = { configurable: { thread_id: "conversation_1" } };

// First turn
const response1 = await app.invoke({
  messages: [{ role: "user", content: "I'm planning a trip to Paris" }]
}, config);

// Second turn - context is maintained
const response2 = await app.invoke({
  messages: [{ role: "user", content: "What hotels would you recommend?" }]
}, config);

// Third turn - agent can reference previous conversation
const response3 = await app.invoke({
  messages: [{ role: "user", content: "Actually, let's also look at restaurants near those hotels" }]
}, config);
```

### How to manage conversation history

Manage conversation history effectively in multi-agent systems to maintain context and improve agent coordination.

```typescript
import { StateGraph, Annotation, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

// Define state with conversation history management
const ConversationState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  conversation_summary: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  active_agent: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
});

// Conversation summarizer node
const summarizeConversation = async (state: typeof ConversationState.State) => {
  const { messages } = state;
  
  // Only summarize if we have enough messages
  if (messages.length < 10) {
    return {};
  }
  
  // Create summary of conversation history
  const conversationText = messages
    .slice(0, -5) // Keep last 5 messages unsummarized
    .map(msg => `${msg.getType()}: ${msg.content}`)
    .join("\n");
    
  const summaryPrompt = `Summarize this conversation history concisely:
${conversationText}

Summary:`;

  const summary = await model.invoke([new HumanMessage(summaryPrompt)]);
  
  // Keep only recent messages plus summary
  const recentMessages = messages.slice(-5);
  const summaryMessage = new AIMessage({
    content: `[Conversation Summary] ${summary.content}`,
    additional_kwargs: { is_summary: true }
  });
  
  return {
    messages: [summaryMessage, ...recentMessages],
    conversation_summary: summary.content,
  };
};

// Agent node that uses conversation history
const agentWithHistory = async (state: typeof ConversationState.State) => {
  const { messages, conversation_summary, active_agent } = state;
  
  // Prepare context with summary if available
  let contextMessages = messages;
  if (conversation_summary) {
    const contextPrompt = `Previous conversation summary: ${conversation_summary}
    
Current conversation:`;
    contextMessages = [new HumanMessage(contextPrompt), ...messages.slice(-5)];
  }
  
  const response = await model.invoke(contextMessages);
  
  return {
    messages: [response],
    active_agent: "main_agent",
  };
};

// Build workflow with conversation management
const conversationWorkflow = new StateGraph(ConversationState)
  .addNode("summarize", summarizeConversation)
  .addNode("agent", agentWithHistory)
  .addEdge(START, "summarize")
  .addEdge("summarize", "agent")
  .addEdge("agent", "summarize");

const conversationApp = conversationWorkflow.compile({
  checkpointer: memory,
});
```

### How to add and use subgraphs

Use subgraphs to implement specialized agent behaviors and create modular multi-agent architectures.

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";

// Define subgraph state for specialized agent
const SpecialistState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  specialist_type: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  analysis_result: Annotation<any>({
    reducer: (x, y) => y ?? x,
  }),
});

// Create specialist subgraph
const createSpecialistSubgraph = (specialistType: string) => {
  const specialistNode = async (state: typeof SpecialistState.State) => {
    const { messages } = state;
    
    const specialistPrompt = `You are a ${specialistType} specialist. 
Analyze the following request and provide expert advice:
${messages[messages.length - 1].content}`;

    const response = await model.invoke([new HumanMessage(specialistPrompt)]);
    
    return {
      messages: [response],
      specialist_type: specialistType,
      analysis_result: {
        type: specialistType,
        recommendation: response.content,
        confidence: 0.9,
      },
    };
  };

  return new StateGraph(SpecialistState)
    .addNode("analyze", specialistNode)
    .addEdge(START, "analyze")
    .addEdge("analyze", END)
    .compile();
};

// Create different specialist subgraphs
const hotelSpecialistGraph = createSpecialistSubgraph("hotel");
const restaurantSpecialistGraph = createSpecialistSubgraph("restaurant");
const activitySpecialistGraph = createSpecialistSubgraph("activity");

// Main coordinator state
const CoordinatorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  specialist_results: Annotation<any[]>({
    reducer: (x, y) => [...(x || []), ...(y || [])],
  }),
  current_specialist: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
});

// Coordinator that routes to subgraphs
const coordinatorNode = async (state: typeof CoordinatorState.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1].content;
  
  // Determine which specialist to consult
  let specialist = "hotel";
  if (lastMessage.toLowerCase().includes("restaurant") || lastMessage.toLowerCase().includes("food")) {
    specialist = "restaurant";
  } else if (lastMessage.toLowerCase().includes("activity") || lastMessage.toLowerCase().includes("tour")) {
    specialist = "activity";
  }
  
  return {
    current_specialist: specialist,
  };
};

// Subgraph invoker
const invokeSpecialist = async (state: typeof CoordinatorState.State) => {
  const { messages, current_specialist } = state;
  
  let subgraph;
  switch (current_specialist) {
    case "restaurant":
      subgraph = restaurantSpecialistGraph;
      break;
    case "activity":
      subgraph = activitySpecialistGraph;
      break;
    default:
      subgraph = hotelSpecialistGraph;
  }
  
  // Invoke the specialist subgraph
  const result = await subgraph.invoke({
    messages,
    specialist_type: current_specialist,
  });
  
  return {
    messages: result.messages,
    specialist_results: [result.analysis_result],
  };
};

// Build main workflow with subgraphs
const multiAgentWorkflow = new StateGraph(CoordinatorState)
  .addNode("coordinator", coordinatorNode)
  .addNode("specialist", invokeSpecialist)
  .addEdge(START, "coordinator")
  .addEdge("coordinator", "specialist")
  .addEdge("specialist", END);

const multiAgentApp = multiAgentWorkflow.compile({
  checkpointer: new MemorySaver(),
});

// Usage with subgraphs
const result = await multiAgentApp.invoke({
  messages: [new HumanMessage("I need help finding a good restaurant in Tokyo")],
});
```
