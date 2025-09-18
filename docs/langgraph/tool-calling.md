# Tool Calling

This guide covers how to use LangGraph's prebuilt ToolNode for tool calling.

ToolNode is a LangChain Runnable that takes graph state (with a list of messages) as input and outputs state update with the result of tool calls. It is designed to work well out-of-box with LangGraph's prebuilt ReAct agent, but can also work with any StateGraph as long as its state has a messages key with an appropriate reducer.

## Related Links

For more detailed information, refer to the official LangGraph.js documentation:

### ToolNode Usage
- [How to call tools using ToolNode](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/)

### Tool Calling Patterns
- [How to force an agent to call a tool](https://langchain-ai.github.io/langgraphjs/how-tos/force-calling-a-tool-first/)
- [How to handle tool calling errors](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling-errors/)
- [How to pass runtime values to tools](https://langchain-ai.github.io/langgraphjs/how-tos/pass-run-time-values-to-tools/)

### State Updates from Tools
- [How to update graph state from tools](https://langchain-ai.github.io/langgraphjs/how-tos/update-state-from-tools/)

### Additional Tool-related Features
- [How to stream events from within a tool](https://langchain-ai.github.io/langgraphjs/how-tos/streaming-events-from-within-tools/)

## ToolNode Usage

### How to call tools using ToolNode

This guide covers how to use LangGraph's prebuilt ToolNode for tool calling.

```typescript
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Define tools
const getWeather = tool(
  (input) => {
    if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
      return "It's 60 degrees and foggy.";
    } else {
      return "It's 90 degrees and sunny.";
    }
  },
  {
    name: "get_weather",
    description: "Call to get the current weather.",
    schema: z.object({
      location: z.string().describe("Location to get the weather for."),
    }),
  }
);

// Create ToolNode
const toolNode = new ToolNode([getWeather]);

// Manual invocation
const toolResult = await toolNode.invoke({
  messages: [
    new AIMessage({
      content: "",
      tool_calls: [
        {
          name: "get_weather",
          args: { location: "sf" },
          id: "tool_call_id",
        },
      ],
    }),
  ],
});
```

### Using with chat models

ToolNode is designed to work well out-of-box with LangGraph's prebuilt ReAct agent, but can also work with any StateGraph as long as its state has a messages key with an appropriate reducer.

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, Annotation, START } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// Bind tools to model
const model = new ChatAnthropic({
  model: "claude-3-5-sonnet-20240620",
  temperature: 0,
}).bindTools([getWeather]);

const callModel = async (state: typeof StateAnnotation.State) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const shouldContinue = (state: typeof StateAnnotation.State) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
};

// Create workflow with ToolNode
const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode([getWeather]))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const app = workflow.compile();
```

### ReAct Agent

Complete ReAct agent implementation using ToolNode for tool execution.

```typescript
// ReAct Agent with ToolNode
const reactAgent = async () => {
  const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode([getWeather]))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      __end__: "__end__",
    })
    .addEdge("tools", "agent");

  const app = workflow.compile();

  const finalState = await app.invoke({
    messages: [new HumanMessage("what is the weather in sf")],
  });

  console.log(finalState.messages[finalState.messages.length - 1].content);
};
```

## Tool Calling Patterns

### How to force an agent to call a tool

Sometimes you want to force an agent to call a tool first, before it makes any plans. This can be useful if you want to force the agent to call a specific tool.

```typescript
import { StateGraph, Annotation, START } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// Set up the tools
const search = tool(
  async (input) => {
    return "Cold, with a low of 3℃";
  },
  {
    name: "search",
    description: "Use to surf the web, fetch current information, check the weather, and retrieve other information.",
    schema: z.object({
      query: z.string().describe("The query to use in your search."),
    }),
  }
);

// Set up the model with forced tool calling
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

// First model that forces tool calling
const firstModel = model.bindTools([search], {
  tool_choice: "search", // Force the search tool to be called
});

// Regular model for follow-up
const regularModel = model.bindTools([search]);

// Define the agent state
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// Define the nodes
const callFirstModel = async (state: typeof AgentState.State) => {
  const response = await firstModel.invoke(state.messages);
  return { messages: [response] };
};

const callModel = async (state: typeof AgentState.State) => {
  const response = await regularModel.invoke(state.messages);
  return { messages: [response] };
};

// Define the graph
const workflow = new StateGraph(AgentState)
  .addNode("first_agent", callFirstModel)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode([search]))
  .addEdge(START, "first_agent")
  .addEdge("first_agent", "tools")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const app = workflow.compile();
```

### How to handle tool calling errors

When tools encounter errors during execution, it's important to handle them gracefully to prevent the agent from getting stuck or producing unhelpful responses.

```typescript
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Tool that might fail
const unreliableTool = tool(
  async (input) => {
    if (Math.random() < 0.5) {
      throw new Error("Tool execution failed");
    }
    return "Success!";
  },
  {
    name: "unreliable_tool",
    description: "A tool that might fail",
    schema: z.object({
      input: z.string(),
    }),
  }
);

// Custom error handling ToolNode
class ErrorHandlingToolNode extends ToolNode {
  async invoke(input: any, config?: any) {
    try {
      return await super.invoke(input, config);
    } catch (error) {
      // Handle tool execution errors
      const errorMessage = new ToolMessage({
        content: `Tool execution failed: ${error.message}`,
        tool_call_id: input.messages[input.messages.length - 1].tool_calls?.[0]?.id || "unknown",
      });
      
      return { messages: [errorMessage] };
    }
  }
}

// Use error handling ToolNode
const errorHandlingToolNode = new ErrorHandlingToolNode([unreliableTool]);

const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", errorHandlingToolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");
```

### How to pass runtime values to tools

Sometimes you may want to pass runtime values to your tools - values that are only known when the graph is invoked and not when it's defined.

```typescript
// Tool that uses runtime configuration
const configurableTool = tool(
  async (input, config) => {
    const userId = config?.configurable?.user_id;
    const apiKey = config?.configurable?.api_key;
    
    // Use runtime configuration
    return `Processing ${input.query} for user ${userId} with API key ${apiKey?.slice(0, 8)}...`;
  },
  {
    name: "configurable_tool",
    description: "A tool that uses runtime configuration",
    schema: z.object({
      query: z.string().describe("The query to process"),
    }),
  }
);

// Pass runtime values through config
const result = await app.invoke(
  { messages: [new HumanMessage("process my data")] },
  {
    configurable: {
      user_id: "user123",
      api_key: "sk-1234567890abcdef",
    },
  }
);

// Access config in nodes
const nodeWithConfig = async (state: typeof StateAnnotation.State, config: RunnableConfig) => {
  const userId = config?.configurable?.user_id;
  console.log(`Processing for user: ${userId}`);
  
  const response = await model.invoke(state.messages, config);
  return { messages: [response] };
};
```

## State Updates from Tools

### How to update graph state from tools

By default, ToolNode will add tool outputs as ToolMessages to the messages list. However, you may want to update other parts of the graph state based on tool outputs.

```typescript
// Extended state annotation with additional fields
const ExtendedStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  user_info: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
  }),
  operation_count: Annotation<number>({
    reducer: (x, y) => (x || 0) + (y || 0),
  }),
});

// Tool that updates multiple state fields
const stateUpdatingTool = tool(
  async (input) => {
    // Perform operation
    const result = await performOperation(input.operation);
    
    // Return structured data that can update state
    return JSON.stringify({
      result: result,
      state_updates: {
        user_info: { last_operation: input.operation },
        operation_count: 1,
      },
    });
  },
  {
    name: "update_state_tool",
    description: "Tool that updates graph state",
    schema: z.object({
      operation: z.string().describe("Operation to perform"),
    }),
  }
);

// Custom node to process tool results and update state
const processToolResults = async (state: typeof ExtendedStateAnnotation.State) => {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage._getType() === "tool") {
    try {
      const toolResult = JSON.parse(lastMessage.content as string);
      
      if (toolResult.state_updates) {
        return {
          messages: [new AIMessage(`Operation completed: ${toolResult.result}`)],
          ...toolResult.state_updates,
        };
      }
    } catch (error) {
      // Handle parsing errors
      console.error("Failed to parse tool result:", error);
    }
  }
  
  return { messages: [] };
};

// Workflow with state updates
const stateUpdatingWorkflow = new StateGraph(ExtendedStateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode([stateUpdatingTool]))
  .addNode("process_results", processToolResults)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "process_results")
  .addEdge("process_results", "agent");

const app = stateUpdatingWorkflow.compile();
```
