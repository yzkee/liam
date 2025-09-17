# Advanced Features

## Subgraphs

### How to Add and Use Subgraphs

Subgraphs allow you to compose complex workflows by embedding one graph within another. This is useful for creating modular, reusable components and organizing complex logic.

#### Basic Subgraph Usage

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// Define the parent graph state
const ParentState = Annotation.Root({
  user_input: Annotation<string>,
  final_response: Annotation<string>
});

// Define the subgraph state (can share keys with parent)
const SubgraphState = Annotation.Root({
  user_input: Annotation<string>,
  processed_data: Annotation<string>
});

// Create subgraph nodes
function processInput(state: typeof SubgraphState.State) {
  return {
    processed_data: `Processed: ${state.user_input}`
  };
}

// Create the subgraph
const subgraph = new StateGraph(SubgraphState)
  .addNode("process", processInput)
  .addEdge(START, "process")
  .addEdge("process", END)
  .compile();

// Parent graph node that uses the subgraph
function callSubgraph(state: typeof ParentState.State) {
  const result = subgraph.invoke({ user_input: state.user_input });
  return {
    final_response: result.processed_data
  };
}

// Create the parent graph
const parentGraph = new StateGraph(ParentState)
  .addNode("subgraph_node", callSubgraph)
  .addEdge(START, "subgraph_node")
  .addEdge("subgraph_node", END)
  .compile();
```

#### Subgraphs with Different Schemas

When the subgraph state is completely independent from the parent graph state:

```typescript
// Parent graph state
const ParentState = Annotation.Root({
  messages: Annotation<string[]>
});

// Child graph state (completely different)
const ChildState = Annotation.Root({
  aggregate: Annotation<string[]>
});

// Grandchild graph state
const GrandchildState = Annotation.Root({
  name: Annotation<string>,
  path: Annotation<string[]>
});

// Grandchild graph nodes
function grandchildNode1(state: typeof GrandchildState.State) {
  return { path: [...state.path, "grandchild_1"] };
}

function grandchildNode2(state: typeof GrandchildState.State) {
  return { path: [...state.path, "grandchild_2"] };
}

// Create grandchild graph
const grandchildGraph = new StateGraph(GrandchildState)
  .addNode("grandchild_1", grandchildNode1)
  .addNode("grandchild_2", grandchildNode2)
  .addEdge(START, "grandchild_1")
  .addEdge("grandchild_1", "grandchild_2")
  .addEdge("grandchild_2", END)
  .compile();

// Child graph node that calls grandchild
function childNode(state: typeof ChildState.State) {
  const result = grandchildGraph.invoke({
    name: "test",
    path: []
  });
  return {
    aggregate: [...state.aggregate, `Path: ${result.path.join(" -> ")}`]
  };
}

// Create child graph
const childGraph = new StateGraph(ChildState)
  .addNode("child_node", childNode)
  .addEdge(START, "child_node")
  .addEdge("child_node", END)
  .compile();

// Parent graph node
function parentNode(state: typeof ParentState.State) {
  const result = childGraph.invoke({ aggregate: [] });
  return {
    messages: [...state.messages, ...result.aggregate]
  };
}

// Create parent graph
const parentGraph = new StateGraph(ParentState)
  .addNode("parent_node", parentNode)
  .addEdge(START, "parent_node")
  .addEdge("parent_node", END)
  .compile();
```

### How to View and Update State in Subgraphs

You can manage and inspect state at different levels of nested subgraphs, including resuming from breakpoints and modifying state.

#### Resuming from Breakpoints

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

// Create graph with checkpointer
const graph = new StateGraph(StateAnnotation)
  .addNode("node1", node1Function)
  .addNode("node2", node2Function)
  .addEdge(START, "node1")
  .addEdge("node1", "node2")
  .addEdge("node2", END)
  .compile({ checkpointer });

// Run with thread for state persistence
const config = { configurable: { thread_id: "1" } };
const result = await graph.invoke({ input: "test" }, config);

// Resume from a specific checkpoint
const checkpoints = await graph.getStateHistory(config);
const specificCheckpoint = checkpoints[1]; // Get specific checkpoint

// Resume from that checkpoint
const resumedResult = await graph.invoke(
  null, 
  { ...config, configurable: { ...config.configurable, checkpoint_id: specificCheckpoint.id } }
);
```

#### Modifying Subgraph State

```typescript
// Update state at a specific checkpoint
await graph.updateState(
  config,
  { new_field: "updated_value" },
  "node1" // Update as if coming from this node
);

// Continue execution after state modification
const continuedResult = await graph.invoke(null, config);
```

### How to Transform Inputs and Outputs of Subgraphs

When you need to transform data between parent and child graphs with different state schemas:

#### Input/Output Transformation

```typescript
// Parent state
const ParentState = Annotation.Root({
  user_request: Annotation<string>,
  final_answer: Annotation<string>
});

// Child state (different schema)
const ChildState = Annotation.Root({
  query: Annotation<string>,
  response: Annotation<string>
});

// Child graph
function processQuery(state: typeof ChildState.State) {
  return {
    response: `Processed query: ${state.query}`
  };
}

const childGraph = new StateGraph(ChildState)
  .addNode("process", processQuery)
  .addEdge(START, "process")
  .addEdge("process", END)
  .compile();

// Parent node with input/output transformation
function transformAndCall(state: typeof ParentState.State) {
  // Transform parent state to child state format
  const childInput = {
    query: state.user_request.toUpperCase() // Transform input
  };
  
  // Call child graph
  const childResult = childGraph.invoke(childInput);
  
  // Transform child result back to parent state format
  return {
    final_answer: `Final: ${childResult.response}` // Transform output
  };
}

const parentGraph = new StateGraph(ParentState)
  .addNode("transform_call", transformAndCall)
  .addEdge(START, "transform_call")
  .addEdge("transform_call", END)
  .compile();
```

#### Complex State Mapping

```typescript
// Advanced transformation with multiple fields
function complexTransform(state: typeof ParentState.State) {
  // Extract and transform multiple fields
  const transformedInput = {
    query: extractQuery(state.user_request),
    context: extractContext(state.user_request),
    metadata: {
      timestamp: Date.now(),
      source: "parent_graph"
    }
  };
  
  const result = childGraph.invoke(transformedInput);
  
  // Combine results with existing state
  return {
    final_answer: combineResults(state.final_answer, result.response),
    metadata: result.metadata
  };
}

function extractQuery(request: string): string {
  // Custom extraction logic
  return request.split("?")[0];
}

function extractContext(request: string): string {
  // Custom context extraction
  return request.split("context:")[1] || "";
}

function combineResults(existing: string, newResult: string): string {
  return existing ? `${existing}\n${newResult}` : newResult;
}
```

## Node Retries and Caching

### How to Add Node Retries

Node retries allow you to automatically retry failed nodes with configurable policies, improving the reliability of your graph execution.

#### Basic Retry Configuration

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

const State = Annotation.Root({
  input: Annotation<string>,
  output: Annotation<string>,
  attempts: Annotation<number>
});

// Node that might fail
function unreliableNode(state: typeof State.State) {
  const attempts = (state.attempts || 0) + 1;
  
  // Simulate random failure
  if (Math.random() < 0.7 && attempts < 3) {
    throw new Error(`Attempt ${attempts} failed`);
  }
  
  return {
    output: `Success on attempt ${attempts}`,
    attempts
  };
}

// Create graph with retry policy
const graph = new StateGraph(State)
  .addNode("unreliable", unreliableNode, {
    retry: {
      maxAttempts: 3,
      retryOn: (error: Error) => {
        // Retry on specific error types
        return error.message.includes("failed");
      }
    }
  })
  .addEdge(START, "unreliable")
  .addEdge("unreliable", END)
  .compile();
```

#### Advanced Retry Policies

```typescript
// Custom retry configuration with exponential backoff
const advancedGraph = new StateGraph(State)
  .addNode("api_call", apiCallNode, {
    retry: {
      maxAttempts: 5,
      retryOn: (error: Error) => {
        // Retry on network errors but not on validation errors
        return error.name === "NetworkError" || error.message.includes("timeout");
      },
      backoff: {
        type: "exponential",
        initialDelay: 1000, // 1 second
        maxDelay: 30000,    // 30 seconds
        multiplier: 2
      }
    }
  })
  .addNode("fallback", fallbackNode)
  .addEdge(START, "api_call")
  .addEdge("api_call", END)
  .addEdge("api_call", "fallback") // Fallback after all retries fail
  .addEdge("fallback", END)
  .compile();

function apiCallNode(state: typeof State.State) {
  // Simulate API call that might fail
  if (Math.random() < 0.5) {
    throw new Error("NetworkError: Connection timeout");
  }
  return { output: "API call successful" };
}

function fallbackNode(state: typeof State.State) {
  return { output: "Fallback response used" };
}
```

#### Conditional Retry Logic

```typescript
// Retry with custom conditions
function smartRetryNode(state: typeof State.State) {
  const attempts = (state.attempts || 0) + 1;
  
  try {
    // Your main logic here
    const result = performOperation(state.input);
    return { output: result, attempts };
  } catch (error) {
    // Custom retry decision logic
    if (shouldRetry(error, attempts)) {
      throw error; // Will trigger retry
    } else {
      // Don't retry, handle gracefully
      return { 
        output: `Failed after ${attempts} attempts: ${error.message}`,
        attempts 
      };
    }
  }
}

function shouldRetry(error: Error, attempts: number): boolean {
  // Custom retry logic
  if (attempts >= 3) return false;
  if (error.message.includes("permanent")) return false;
  if (error.message.includes("rate_limit")) return true;
  return true;
}

function performOperation(input: string): string {
  // Simulate operation that might fail
  if (Math.random() < 0.6) {
    throw new Error("temporary_failure");
  }
  return `Processed: ${input}`;
}
```

### How to Cache Expensive Nodes

Node caching helps avoid repeating expensive operations by storing and reusing results based on input parameters.

#### Basic Node Caching

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { InMemoryCache } from "@langchain/langgraph-checkpoint";

const StateAnnotation = Annotation.Root({
  items: Annotation<string[]>,
  default: () => [],
  reducer: (acc, item) => [...acc, ...item]
});

// Configure cache policy
const cache = new InMemoryCache();

const graph = new StateGraph(StateAnnotation)
  .addNode("node", expensiveNode, {
    cache: {
      policy: "ttl",
      ttl: 120, // 120 seconds TTL
      keySerializer: (state) => `key_${JSON.stringify(state.items)}`
    }
  })
  .addEdge(START, "node")
  .addEdge("node", END)
  .compile({ cache });

function expensiveNode(state: typeof StateAnnotation.State) {
  console.log("Performing expensive operation...");
  // Simulate expensive computation
  const result = state.items.map(item => `processed_${item}`);
  return { items: result };
}
```

#### Advanced Caching with Custom Serialization

```typescript
// Custom cache key generation
const advancedCacheGraph = new StateGraph(StateAnnotation)
  .addNode("expensive_computation", computationNode, {
    cache: {
      policy: "ttl",
      ttl: 300, // 5 minutes
      keySerializer: (state) => {
        // Create cache key based on specific state properties
        const relevantData = {
          items: state.items.sort(), // Sort for consistent keys
          timestamp: Math.floor(Date.now() / 60000) // Round to minute
        };
        return `computation_${JSON.stringify(relevantData)}`;
      }
    }
  })
  .addEdge(START, "expensive_computation")
  .addEdge("expensive_computation", END)
  .compile({ cache });

function computationNode(state: typeof StateAnnotation.State) {
  console.log("Running expensive computation...");
  
  // Simulate heavy computation
  const results = state.items.map(item => {
    // Expensive operation simulation
    let hash = 0;
    for (let i = 0; i < item.length; i++) {
      hash = ((hash << 5) - hash + item.charCodeAt(i)) & 0xffffffff;
    }
    return `computed_${hash}`;
  });
  
  return { items: results };
}
```

#### Cache Performance Comparison

```typescript
// Example showing performance benefits
async function demonstrateCaching() {
  const input = { items: ["item1", "item2", "item3"] };
  
  console.time("First run (no cache)");
  const result1 = await graph.invoke(input);
  console.timeEnd("First run (no cache)");
  
  console.time("Second run (cached)");
  const result2 = await graph.invoke(input);
  console.timeEnd("Second run (cached)");
  
  console.log("Results identical:", JSON.stringify(result1) === JSON.stringify(result2));
}

// Cache invalidation patterns
function invalidateCache(cacheKey: string) {
  cache.delete(cacheKey);
}

// Conditional caching
const conditionalCacheGraph = new StateGraph(StateAnnotation)
  .addNode("conditional_cache", conditionalNode, {
    cache: {
      policy: "ttl",
      ttl: 60,
      shouldCache: (state, result) => {
        // Only cache successful results with more than 2 items
        return result.items && result.items.length > 2;
      }
    }
  })
  .addEdge(START, "conditional_cache")
  .addEdge("conditional_cache", END)
  .compile({ cache });

function conditionalNode(state: typeof StateAnnotation.State) {
  if (state.items.length === 0) {
    throw new Error("No items to process");
  }
  
  return {
    items: state.items.map(item => `cached_${item}`)
  };
}
```

## Runtime Configuration

### How to Add Runtime Configuration to Your Graph

Runtime configuration allows you to dynamically modify graph behavior without changing the code, enabling flexible deployment across different environments and use cases.

#### Basic Runtime Configuration

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// Define configuration schema
interface GraphConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  userId?: string;
}

const State = Annotation.Root({
  messages: Annotation<string[]>,
  response: Annotation<string>
});

// Node that uses runtime configuration
function configurableNode(state: typeof State.State, config: GraphConfig) {
  console.log(`Using model: ${config.model} with temperature: ${config.temperature}`);
  
  // Use configuration to modify behavior
  const response = generateResponse(state.messages, {
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens
  });
  
  return { response };
}

function generateResponse(messages: string[], options: any): string {
  // Simulate model-specific response generation
  const baseResponse = `Response using ${options.model}`;
  
  if (options.temperature > 0.7) {
    return `${baseResponse} (creative mode)`;
  } else {
    return `${baseResponse} (focused mode)`;
  }
}

// Create graph with configuration support
const configurableGraph = new StateGraph(State)
  .addNode("respond", configurableNode)
  .addEdge(START, "respond")
  .addEdge("respond", END)
  .compile();
```

#### Dynamic Model Selection

```typescript
// Configuration for different environments
const developmentConfig: GraphConfig = {
  model: "gpt-3.5-turbo",
  temperature: 0.7,
  maxTokens: 1000
};

const productionConfig: GraphConfig = {
  model: "gpt-4",
  temperature: 0.3,
  maxTokens: 2000
};

// Environment-specific configuration
function getConfig(environment: string): GraphConfig {
  switch (environment) {
    case "development":
      return developmentConfig;
    case "production":
      return productionConfig;
    case "testing":
      return {
        model: "mock-model",
        temperature: 0.0,
        maxTokens: 500
      };
    default:
      return developmentConfig;
  }
}

// Usage with different configurations
async function runWithConfig(input: any, environment: string) {
  const config = getConfig(environment);
  return await configurableGraph.invoke(input, { config });
}
```

#### User-Specific Configuration

```typescript
// User-specific settings
interface UserConfig extends GraphConfig {
  userId: string;
  preferences: {
    verbosity: "low" | "medium" | "high";
    language: string;
    customInstructions?: string;
  };
}

function userAwareNode(state: typeof State.State, config: UserConfig) {
  const { userId, preferences } = config;
  
  console.log(`Processing for user ${userId} with ${preferences.verbosity} verbosity`);
  
  let response = generateResponse(state.messages, config);
  
  // Apply user preferences
  if (preferences.verbosity === "high") {
    response = `Detailed explanation: ${response}`;
  } else if (preferences.verbosity === "low") {
    response = response.split(".")[0] + "."; // First sentence only
  }
  
  if (preferences.customInstructions) {
    response = `${preferences.customInstructions}\n\n${response}`;
  }
  
  return { response };
}

const userAwareGraph = new StateGraph(State)
  .addNode("user_respond", userAwareNode)
  .addEdge(START, "user_respond")
  .addEdge("user_respond", END)
  .compile();

// Usage with user configuration
const userConfig: UserConfig = {
  userId: "user123",
  model: "gpt-4",
  temperature: 0.5,
  maxTokens: 1500,
  preferences: {
    verbosity: "high",
    language: "en",
    customInstructions: "Always be helpful and concise."
  }
};

await userAwareGraph.invoke(
  { messages: ["Hello, how are you?"] },
  { config: userConfig }
);
```

#### Feature Flags and A/B Testing

```typescript
// Feature flag configuration
interface FeatureFlags {
  enableNewAlgorithm: boolean;
  useAdvancedProcessing: boolean;
  experimentGroup: "A" | "B" | "control";
  debugMode: boolean;
}

interface ConfigWithFeatures extends GraphConfig {
  features: FeatureFlags;
}

function featureFlagNode(state: typeof State.State, config: ConfigWithFeatures) {
  const { features } = config;
  
  let response: string;
  
  // Feature flag: new algorithm
  if (features.enableNewAlgorithm) {
    response = processWithNewAlgorithm(state.messages);
  } else {
    response = processWithLegacyAlgorithm(state.messages);
  }
  
  // Feature flag: advanced processing
  if (features.useAdvancedProcessing) {
    response = enhanceResponse(response);
  }
  
  // A/B testing
  if (features.experimentGroup === "A") {
    response = `[Experiment A] ${response}`;
  } else if (features.experimentGroup === "B") {
    response = `[Experiment B] ${response.toUpperCase()}`;
  }
  
  // Debug information
  if (features.debugMode) {
    console.log(`Debug: Processed with flags:`, features);
    response = `${response}\n[Debug: ${JSON.stringify(features)}]`;
  }
  
  return { response };
}

function processWithNewAlgorithm(messages: string[]): string {
  return `New algorithm result for: ${messages.join(", ")}`;
}

function processWithLegacyAlgorithm(messages: string[]): string {
  return `Legacy result for: ${messages.join(", ")}`;
}

function enhanceResponse(response: string): string {
  return `Enhanced: ${response}`;
}

// Configuration schema validation
function validateConfig(config: ConfigWithFeatures): boolean {
  if (!config.model || typeof config.temperature !== "number") {
    throw new Error("Invalid configuration: missing required fields");
  }
  
  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error("Invalid temperature: must be between 0 and 2");
  }
  
  return true;
}

// Create graph with feature flags
const featureFlagGraph = new StateGraph(State)
  .addNode("feature_node", featureFlagNode)
  .addEdge(START, "feature_node")
  .addEdge("feature_node", END)
  .compile();

// Example configurations for different scenarios
const configA: ConfigWithFeatures = {
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 1000,
  features: {
    enableNewAlgorithm: true,
    useAdvancedProcessing: false,
    experimentGroup: "A",
    debugMode: false
  }
};

const configB: ConfigWithFeatures = {
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 1000,
  features: {
    enableNewAlgorithm: true,
    useAdvancedProcessing: true,
    experimentGroup: "B",
    debugMode: true
  }
};

// Usage with validation
async function runWithValidatedConfig(input: any, config: ConfigWithFeatures) {
  validateConfig(config);
  return await featureFlagGraph.invoke(input, { config });
}
```

## Structured Output

### How to Have Agent Respond in Structured Format

Structured output ensures that your agent responses follow a specific format, making them easier to parse and integrate with other systems.

#### Basic Structured Response with Tool Calling

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { z } from "zod";

// Define response schema
const WeatherResponseSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  condition: z.string(),
  humidity: z.number(),
  additionalInfo: z.string().optional()
});

type WeatherResponse = z.infer<typeof WeatherResponseSchema>;

const State = Annotation.Root({
  query: Annotation<string>,
  structuredResponse: Annotation<WeatherResponse>
});

// Tool for structured weather response
const weatherTool = {
  name: "respond_with_weather",
  description: "Respond with structured weather information",
  schema: WeatherResponseSchema,
  function: async (args: WeatherResponse): Promise<WeatherResponse> => {
    // Validate the structured response
    return WeatherResponseSchema.parse(args);
  }
};

function structuredWeatherNode(state: typeof State.State) {
  // Simulate getting weather data
  const weatherData: WeatherResponse = {
    location: extractLocation(state.query),
    temperature: Math.round(Math.random() * 30 + 10), // 10-40°C
    condition: getRandomCondition(),
    humidity: Math.round(Math.random() * 100)
  };
  
  // Validate against schema
  const validatedResponse = WeatherResponseSchema.parse(weatherData);
  
  return { structuredResponse: validatedResponse };
}

function extractLocation(query: string): string {
  // Simple location extraction
  const match = query.match(/weather in ([A-Za-z\s]+)/i);
  return match ? match[1].trim() : "Unknown Location";
}

function getRandomCondition(): string {
  const conditions = ["sunny", "cloudy", "rainy", "snowy", "foggy"];
  return conditions[Math.floor(Math.random() * conditions.length)];
}

const weatherGraph = new StateGraph(State)
  .addNode("get_weather", structuredWeatherNode)
  .addEdge(START, "get_weather")
  .addEdge("get_weather", END)
  .compile();
```

#### Complex Structured Output with Nested Objects

```typescript
// Complex response schema with nested structures
const AnalysisResponseSchema = z.object({
  summary: z.string(),
  sentiment: z.object({
    score: z.number().min(-1).max(1),
    label: z.enum(["positive", "negative", "neutral"]),
    confidence: z.number().min(0).max(1)
  }),
  keyTopics: z.array(z.object({
    topic: z.string(),
    relevance: z.number().min(0).max(1),
    mentions: z.number()
  })),
  recommendations: z.array(z.string()),
  metadata: z.object({
    processedAt: z.string(),
    model: z.string(),
    version: z.string()
  })
});

type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

const AnalysisState = Annotation.Root({
  text: Annotation<string>,
  analysis: Annotation<AnalysisResponse>
});

function textAnalysisNode(state: typeof AnalysisState.State) {
  const text = state.text;
  
  // Perform analysis (simplified)
  const analysis: AnalysisResponse = {
    summary: `Analysis of ${text.length} characters of text`,
    sentiment: {
      score: Math.random() * 2 - 1, // -1 to 1
      label: Math.random() > 0.5 ? "positive" : "negative",
      confidence: Math.random()
    },
    keyTopics: [
      {
        topic: "main_theme",
        relevance: Math.random(),
        mentions: Math.floor(Math.random() * 10) + 1
      },
      {
        topic: "secondary_theme",
        relevance: Math.random(),
        mentions: Math.floor(Math.random() * 5) + 1
      }
    ],
    recommendations: [
      "Consider expanding on the main theme",
      "Add more supporting evidence"
    ],
    metadata: {
      processedAt: new Date().toISOString(),
      model: "analysis-v1",
      version: "1.0.0"
    }
  };
  
  // Validate the structured response
  const validatedAnalysis = AnalysisResponseSchema.parse(analysis);
  
  return { analysis: validatedAnalysis };
}

const analysisGraph = new StateGraph(AnalysisState)
  .addNode("analyze", textAnalysisNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", END)
  .compile();
```

#### Streaming Structured JSON

```typescript
// Streaming structured responses
const StreamingState = Annotation.Root({
  query: Annotation<string>,
  partialResponse: Annotation<Partial<WeatherResponse>>,
  finalResponse: Annotation<WeatherResponse>
});

function streamingStructuredNode(state: typeof StreamingState.State) {
  // Simulate streaming by building response incrementally
  const partial: Partial<WeatherResponse> = {};
  
  // Stream location first
  partial.location = extractLocation(state.query);
  
  // Stream temperature
  partial.temperature = Math.round(Math.random() * 30 + 10);
  
  // Stream condition
  partial.condition = getRandomCondition();
  
  // Stream humidity
  partial.humidity = Math.round(Math.random() * 100);
  
  // Validate final complete response
  const finalResponse = WeatherResponseSchema.parse(partial);
  
  return { 
    partialResponse: partial,
    finalResponse 
  };
}

// Response validation and error handling
function validateAndFormatResponse<T>(
  data: unknown, 
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; errors?: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      success: false,
      errors: ["Unknown validation error"]
    };
  }
}

// Usage with validation
async function getStructuredWeather(query: string): Promise<WeatherResponse> {
  const result = await weatherGraph.invoke({ query });
  
  const validation = validateAndFormatResponse(
    result.structuredResponse, 
    WeatherResponseSchema
  );
  
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.errors?.join(", ")}`);
  }
  
  return validation.data!;
}
```

#### Dynamic Schema Selection

```typescript
// Multiple response schemas based on query type
const QuestionResponseSchema = z.object({
  type: z.literal("question"),
  answer: z.string(),
  confidence: z.number(),
  sources: z.array(z.string())
});

const TaskResponseSchema = z.object({
  type: z.literal("task"),
  steps: z.array(z.string()),
  estimatedTime: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"])
});

const GeneralResponseSchema = z.object({
  type: z.literal("general"),
  response: z.string(),
  category: z.string()
});

type ResponseType = 
  | z.infer<typeof QuestionResponseSchema>
  | z.infer<typeof TaskResponseSchema>
  | z.infer<typeof GeneralResponseSchema>;

const DynamicState = Annotation.Root({
  input: Annotation<string>,
  responseType: Annotation<"question" | "task" | "general">,
  response: Annotation<ResponseType>
});

function classifyAndRespond(state: typeof DynamicState.State) {
  const input = state.input.toLowerCase();
  
  // Classify the input type
  let responseType: "question" | "task" | "general";
  if (input.includes("?") || input.startsWith("what") || input.startsWith("how")) {
    responseType = "question";
  } else if (input.includes("do") || input.includes("create") || input.includes("make")) {
    responseType = "task";
  } else {
    responseType = "general";
  }
  
  // Generate appropriate structured response
  let response: ResponseType;
  
  switch (responseType) {
    case "question":
      response = {
        type: "question",
        answer: `Answer to: ${state.input}`,
        confidence: Math.random(),
        sources: ["source1.com", "source2.com"]
      };
      break;
    case "task":
      response = {
        type: "task",
        steps: ["Step 1", "Step 2", "Step 3"],
        estimatedTime: "30 minutes",
        difficulty: "medium"
      };
      break;
    default:
      response = {
        type: "general",
        response: `General response to: ${state.input}`,
        category: "conversation"
      };
  }
  
  return { responseType, response };
}

const dynamicGraph = new StateGraph(DynamicState)
  .addNode("classify_respond", classifyAndRespond)
  .addEdge(START, "classify_respond")
  .addEdge("classify_respond", END)
  .compile();

// Usage with type-safe responses
async function getTypedResponse(input: string): Promise<ResponseType> {
  const result = await dynamicGraph.invoke({ input });
  
  // Validate based on response type
  switch (result.responseType) {
    case "question":
      return QuestionResponseSchema.parse(result.response);
    case "task":
      return TaskResponseSchema.parse(result.response);
    case "general":
      return GeneralResponseSchema.parse(result.response);
    default:
      throw new Error("Unknown response type");
  }
}
```

## Production & Platform

### Application Structure

A LangGraph application must be configured with a LangGraph configuration file in order to be deployed to LangGraph Platform (or to be self-hosted). This how-to guide discusses the basic steps to setup a LangGraph application for deployment using `requirements.txt` to specify project dependencies.

#### Setup with pyproject.toml

If you prefer using poetry for dependency management, check out the how-to guide on using `pyproject.toml` for LangGraph Platform.

#### Setup with a Monorepo

If you are interested in deploying a graph located inside a monorepo, take a look at this repository for an example of how to do so.

The final repository structure will look something like this:

```
my-app/
├── my_agent # all project code lies within here
│   ├── utils # utilities for your graph
│   ├── __init__.py
│   ├── tools.py # tools for your graph
│   ├── prompts.py # prompts for your graph
│   └── state.py # state definition of your graph
├── requirements.txt # package dependencies
└── init.py
```

#### Specify Dependencies

Create a `requirements.txt` file in the root of your repository and specify the dependencies for your project:

```txt
langchain-openai
langgraph
```

#### Specify Environment Variables

Environment variables can be specified in the deployment settings. Sensitive values such as API keys (e.g., `OPENAI_API_KEY`) should be specified as secrets.

Additional non-secret environment variables can be specified as well.

#### Define Graphs

Create your graph definition in a Python file. For example, in `my_agent/state.py`:

```python
from typing import TypedDict
from langgraph import StateGraph

class State(TypedDict):
    messages: list

def my_node(state: State):
    return {"messages": state["messages"] + ["Hello from my_node"]}

graph = StateGraph(State)
graph.add_node("my_node", my_node)
graph.set_entry_point("my_node")
graph.set_finish_point("my_node")
```

#### Create LangGraph Configuration File

Create a `langgraph.json` configuration file in the root of your repository:

```json
{
  "dependencies": ["requirements.txt"],
  "graphs": {
    "my_graph": "./my_agent/state.py:graph"
  },
  "env": ".env"
}
```

### Deployment

#### Create New Deployment

To deploy your LangGraph application:

1. Navigate to the LangGraph Platform and create a new deployment
2. Authorize LangChain's hosted-langserve GitHub app to access the selected repositories
3. After installation is complete, return to the Create New Deployment panel and select the GitHub repository to deploy from the dropdown menu
4. Specify a name for the deployment
5. Specify the desired Git Branch. A deployment is linked to a branch. When a new revision is created, code for the linked branch will be deployed
6. Specify the full path to the LangGraph API config file including the file name. For example, if the file `langgraph.json` is in the root of the repository, simply specify `langgraph.json`
7. Check/uncheck checkbox to automatically update deployment on push to branch. If checked, the deployment will automatically be updated when changes are pushed to the specified Git Branch
8. Select the desired Deployment Type:
   - Development deployments are meant for non-production use cases and are provisioned with minimal resources
   - Production deployments can serve up to 500 requests/second and are provisioned with highly available storage with automatic backups
9. Determine if the deployment should be shareable through LangGraph Studio. If unchecked, the deployment will only be accessible with a valid LangSmith API key for the workspace. If checked, the deployment will be accessible through LangGraph Studio to any LangSmith user
10. Specify Environment Variables and secrets. Sensitive values such as API keys should be specified as secrets
11. A new LangSmith Tracing Project is automatically created with the same name as the deployment

#### Environment Variables

Environment variables and secrets can be configured for deployments:

- Sensitive values such as API keys (e.g., `OPENAI_API_KEY`) should be specified as secrets
- Additional non-secret environment variables can be specified as well

### Streaming API

LangGraph makes it easy to stream the state of the graph as it executes. Use the stream modes `updates` and `values` to stream the state of the graph as it executes.

#### Basic Usage

```python
from langgraph_sdk import get_client

client = get_client(url=DEPLOYMENT_URL)

# Using the graph deployed with the name "agent"
assistant_id = "agent"
# create a thread
thread = client.threads.create()
thread_id = thread.thread_id

# If you don't need to persist the outputs of a run, you can pass None instead of thread_id when streaming.
```

#### Stream Graph State

Use this to stream only the state updates returned by the nodes after each step. The streamed outputs include the name of the node as well as the update.

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="updates"
):
    print(chunk.data)
```

#### Stream Multiple Modes

You can stream multiple modes at once by passing a list of modes:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode=["updates", "values"]
):
    print(chunk.data)
```

#### Stream Values

Use this to stream the full value of the state after each step. The streamed outputs include the name of the node as well as the update.

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="values"
):
    print(chunk.data)
```

#### Stream Debug Information

Use the `debug` stream mode to get debug information about the graph execution:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="debug"
):
    print(chunk.data)
```

#### Stream LLM Tokens

Use the `messages-tuple` stream mode to stream LLM tokens as they are generated:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="messages-tuple"
):
    print(chunk.data)
```

#### Stream Custom Data

Use the `custom` stream mode to stream custom data from your nodes:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="custom"
):
    print(chunk.data)
```

#### Stream Events

Use the `events` stream mode to stream events from the graph execution:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="events"
):
    print(chunk.data)
```

#### Stateful vs Stateless Runs

Examples above assume that you want to persist the outputs of a streaming run in the checkpointer DB and have created a thread. To create a thread:

```python
thread = client.threads.create()
thread_id = thread.thread_id
```

If you don't need to persist the outputs of a run, you can pass `None` instead of `thread_id` when streaming.

#### Subgraphs

Subgraphs can also be streamed. The streaming behavior is the same as for regular graphs, but you can specify which subgraph to stream from using the subgraph parameter.

### Authentication & Access Control

#### Client Authentication

To authenticate with the LangGraph Platform, you need to configure your client with the appropriate credentials:

```python
from langgraph_sdk import get_client

# Using API key authentication
client = get_client(
    url="https://your-deployment-url.com",
    api_key="your-api-key"
)
```

#### Deployment URL Setup

Each deployment has a unique URL that can be used to access the deployed graph:

```python
# Example deployment URL
DEPLOYMENT_URL = "https://your-deployment-id.us.langgraph.app"

client = get_client(url=DEPLOYMENT_URL)
```

#### API Key Configuration

API keys should be configured as environment variables or secrets in your deployment settings. For local development, you can set them in your environment:

```bash
export LANGGRAPH_API_KEY="your-api-key"
export OPENAI_API_KEY="your-openai-key"
```

### Debugging & Monitoring

#### Debug Stream Mode

Use the debug stream mode to get comprehensive information about graph execution:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "debugging"},
    stream_mode="debug"
):
    # Debug information includes:
    # - Node execution details
    # - State transitions
    # - Error information
    # - Performance metrics
    print(f"Debug info: {chunk.data}")
```

#### Comprehensive Logging

Enable comprehensive logging in your graph nodes for better debugging:

```python
import logging

logger = logging.getLogger(__name__)

def my_node(state):
    logger.info(f"Processing state: {state}")
    try:
        # Your node logic here
        result = process_data(state)
        logger.info(f"Node completed successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Node failed with error: {e}")
        raise
```

#### Troubleshooting

Common troubleshooting patterns:

1. **Check deployment status**: Verify your deployment is running and accessible
2. **Validate configuration**: Ensure your `langgraph.json` file is correctly configured
3. **Monitor environment variables**: Check that all required environment variables and secrets are set
4. **Review logs**: Use debug stream mode to get detailed execution information
5. **Test locally**: Test your graph locally before deploying to catch issues early

#### Performance Monitoring

Monitor your deployment performance using the built-in metrics:

- Request latency
- Throughput (requests per second)
- Error rates
- Resource utilization

Access these metrics through the LangGraph Platform dashboard or via the monitoring API.

## Additional Advanced Features

### How to Defer Node Execution

Deferred node execution allows you to delay the execution of a node until all other pending tasks are completed. This is particularly useful in workflows with branches of different lengths, such as map-reduce flows.

#### Basic Deferred Execution

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  aggregate: Annotation<string[]>,
  default: () => [],
  reducer: (acc, value) => [...acc, ...value]
});

const graph = new StateGraph(StateAnnotation)
  .addNode("a", (state) => {
    console.log(`Adding "A" to ${state.aggregate.join(", ")}`);
    return { aggregate: ["A"] };
  })
  .addNode("b", (state) => {
    console.log(`Adding "B" to ${state.aggregate.join(", ")}`);
    return { aggregate: ["B"] };
  })
  .addNode("b2", (state) => {
    console.log(`Adding "B.2" to ${state.aggregate.join(", ")}`);
    return { aggregate: ["B.2"] };
  }, { defer: true }) // Defer this node execution
  .addEdge(START, "a")
  .addEdge(START, "b")
  .addEdge("a", "b2")
  .addEdge("b", "b2")
  .addEdge("b2", END)
  .compile();
```

#### Map-Reduce Pattern with Deferred Execution

```typescript
// Complex workflow with multiple branches
const MapReduceState = Annotation.Root({
  items: Annotation<string[]>,
  processed: Annotation<string[]>,
  default: () => [],
  reducer: (acc, value) => [...acc, ...value]
});

function mapNode1(state: typeof MapReduceState.State) {
  console.log("Processing in map node 1");
  return { 
    processed: state.items.slice(0, 2).map(item => `map1_${item}`)
  };
}

function mapNode2(state: typeof MapReduceState.State) {
  console.log("Processing in map node 2");
  return { 
    processed: state.items.slice(2).map(item => `map2_${item}`)
  };
}

function reduceNode(state: typeof MapReduceState.State) {
  console.log("Reducing all processed items");
  const reduced = state.processed.join(" + ");
  return { processed: [reduced] };
}

const mapReduceGraph = new StateGraph(MapReduceState)
  .addNode("map1", mapNode1)
  .addNode("map2", mapNode2)
  .addNode("reduce", reduceNode, { defer: true }) // Wait for all map nodes
  .addEdge(START, "map1")
  .addEdge(START, "map2")
  .addEdge("map1", "reduce")
  .addEdge("map2", "reduce")
  .addEdge("reduce", END)
  .compile();

// Usage
const result = await mapReduceGraph.invoke({
  items: ["item1", "item2", "item3", "item4"]
});
console.log("Final result:", result.processed);
```

#### Conditional Deferred Execution

```typescript
// Deferred execution with conditions
const ConditionalState = Annotation.Root({
  data: Annotation<any[]>,
  results: Annotation<string[]>,
  shouldDefer: Annotation<boolean>
});

function conditionalDeferredNode(state: typeof ConditionalState.State) {
  console.log("Executing conditionally deferred node");
  return {
    results: [`Processed ${state.data.length} items`]
  };
}

function determineDefer(state: typeof ConditionalState.State) {
  // Decide whether to defer based on state
  return { shouldDefer: state.data.length > 5 };
}

const conditionalGraph = new StateGraph(ConditionalState)
  .addNode("check", determineDefer)
  .addNode("process", conditionalDeferredNode, { 
    defer: (state) => state.shouldDefer // Dynamic defer decision
  })
  .addEdge(START, "check")
  .addEdge("check", "process")
  .addEdge("process", END)
  .compile();
```

### How to Let Agent Return Tool Results Directly

This pattern allows agents to return tool results directly as the final answer, bypassing additional processing when the tool output is sufficient.

#### Basic Direct Tool Return

```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

const State = Annotation.Root({
  messages: Annotation<string[]>,
  toolResult: Annotation<any>,
  finalAnswer: Annotation<string>
});

// Tool that can provide direct answers
const searchTool = {
  name: "search",
  description: "Search for information",
  function: async (query: string) => {
    // Simulate search results
    return {
      query,
      results: [`Result 1 for ${query}`, `Result 2 for ${query}`],
      directAnswer: `Direct answer for: ${query}`,
      confidence: Math.random()
    };
  }
};

function agentNode(state: typeof State.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Determine if we should use a tool
  if (lastMessage.includes("search")) {
    const query = extractQuery(lastMessage);
    const toolResult = searchTool.function(query);
    
    // Check if tool result can be returned directly
    if (shouldReturnDirectly(toolResult)) {
      return {
        toolResult,
        finalAnswer: toolResult.directAnswer
      };
    }
  }
  
  // Continue with normal processing
  return {
    finalAnswer: `Processed: ${lastMessage}`
  };
}

function shouldReturnDirectly(toolResult: any): boolean {
  // Decide based on tool result quality
  return toolResult.confidence > 0.8;
}

function extractQuery(message: string): string {
  return message.replace("search", "").trim();
}

const directReturnGraph = new StateGraph(State)
  .addNode("agent", agentNode)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile();
```

#### Advanced Direct Return with Multiple Tools

```typescript
// Multiple tools with different return strategies
const calculatorTool = {
  name: "calculator",
  function: (expression: string) => {
    try {
      const result = eval(expression); // Note: eval is dangerous in production
      return {
        expression,
        result,
        isExact: true,
        explanation: `${expression} = ${result}`
      };
    } catch (error) {
      return {
        expression,
        error: error.message,
        isExact: false
      };
    }
  }
};

const weatherTool = {
  name: "weather",
  function: (location: string) => {
    return {
      location,
      temperature: Math.round(Math.random() * 30 + 10),
      condition: "sunny",
      canReturnDirectly: true,
      formatted: `Weather in ${location}: sunny, 25°C`
    };
  }
};

function smartAgentNode(state: typeof State.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Calculator tool
  if (lastMessage.includes("calculate") || /\d+[\+\-\*\/]\d+/.test(lastMessage)) {
    const expression = extractMathExpression(lastMessage);
    const result = calculatorTool.function(expression);
    
    if (result.isExact) {
      return {
        toolResult: result,
        finalAnswer: result.explanation
      };
    }
  }
  
  // Weather tool
  if (lastMessage.includes("weather")) {
    const location = extractLocation(lastMessage);
    const result = weatherTool.function(location);
    
    if (result.canReturnDirectly) {
      return {
        toolResult: result,
        finalAnswer: result.formatted
      };
    }
  }
  
  // Default processing
  return {
    finalAnswer: `I need more information to help with: ${lastMessage}`
  };
}

function extractMathExpression(message: string): string {
  const match = message.match(/(\d+[\+\-\*\/]\d+)/);
  return match ? match[1] : message;
}

function extractLocation(message: string): string {
  const match = message.match(/weather in ([A-Za-z\s]+)/i);
  return match ? match[1].trim() : "Unknown";
}

const smartGraph = new StateGraph(State)
  .addNode("smart_agent", smartAgentNode)
  .addEdge(START, "smart_agent")
  .addEdge("smart_agent", END)
  .compile();
```

#### Conditional Tool Return with Fallback

```typescript
// Tool return with fallback processing
const ConditionalState = Annotation.Root({
  query: Annotation<string>,
  toolResults: Annotation<any[]>,
  needsProcessing: Annotation<boolean>,
  finalResponse: Annotation<string>
});

function toolCallNode(state: typeof ConditionalState.State) {
  const query = state.query;
  const results = [];
  
  // Try multiple tools
  if (query.includes("weather")) {
    const weatherResult = weatherTool.function(extractLocation(query));
    results.push(weatherResult);
    
    if (weatherResult.canReturnDirectly) {
      return {
        toolResults: results,
        needsProcessing: false,
        finalResponse: weatherResult.formatted
      };
    }
  }
  
  if (query.includes("calculate")) {
    const calcResult = calculatorTool.function(extractMathExpression(query));
    results.push(calcResult);
    
    if (calcResult.isExact) {
      return {
        toolResults: results,
        needsProcessing: false,
        finalResponse: calcResult.explanation
      };
    }
  }
  
  // Need additional processing
  return {
    toolResults: results,
    needsProcessing: true
  };
}

function processingNode(state: typeof ConditionalState.State) {
  // Additional processing when direct return isn't suitable
  const processed = state.toolResults.map(result => 
    `Processed: ${JSON.stringify(result)}`
  ).join("\n");
  
  return {
    finalResponse: `After processing:\n${processed}`
  };
}

function shouldProcess(state: typeof ConditionalState.State) {
  return state.needsProcessing ? "process" : END;
}

const conditionalToolGraph = new StateGraph(ConditionalState)
  .addNode("tool_call", toolCallNode)
  .addNode("process", processingNode)
  .addEdge(START, "tool_call")
  .addConditionalEdges("tool_call", shouldProcess, {
    process: "process",
    [END]: END
  })
  .addEdge("process", END)
  .compile();
```

### How to Manage Agent Steps

Managing agent steps involves controlling the flow of conversation history and intermediate processing steps to optimize performance and maintain context.

#### Basic Step Management

```typescript
const StepState = Annotation.Root({
  messages: Annotation<string[]>,
  stepCount: Annotation<number>,
  maxSteps: Annotation<number>,
  currentStep: Annotation<string>
});

function stepManagedNode(state: typeof StepState.State) {
  const stepCount = (state.stepCount || 0) + 1;
  
  // Check step limit
  if (stepCount > state.maxSteps) {
    return {
      stepCount,
      currentStep: "max_steps_reached",
      messages: [...state.messages, "Maximum steps reached"]
    };
  }
  
  // Process current step
  const newMessage = `Step ${stepCount}: Processing...`;
  
  return {
    stepCount,
    currentStep: `step_${stepCount}`,
    messages: [...state.messages, newMessage]
  };
}

function shouldContinue(state: typeof StepState.State) {
  if (state.stepCount >= state.maxSteps) {
    return END;
  }
  
  // Continue if we haven't reached the goal
  const lastMessage = state.messages[state.messages.length - 1];
  return lastMessage.includes("Processing") ? "continue" : END;
}

const stepManagedGraph = new StateGraph(StepState)
  .addNode("process_step", stepManagedNode)
  .addEdge(START, "process_step")
  .addConditionalEdges("process_step", shouldContinue, {
    continue: "process_step",
    [END]: END
  })
  .compile();
```

#### Message History Truncation

```typescript
// Manage conversation history to prevent context overflow
const ConversationState = Annotation.Root({
  messages: Annotation<string[]>,
  maxMessages: Annotation<number>,
  summary: Annotation<string>
});

function truncateMessages(messages: string[], maxMessages: number): {
  truncated: string[];
  summary: string;
} {
  if (messages.length <= maxMessages) {
    return { truncated: messages, summary: "" };
  }
  
  // Keep recent messages and summarize older ones
  const recentMessages = messages.slice(-maxMessages);
  const oldMessages = messages.slice(0, -maxMessages);
  
  const summary = `Previous conversation summary: ${oldMessages.length} messages covering topics: ${
    oldMessages.slice(0, 3).join(", ")
  }...`;
  
  return { truncated: recentMessages, summary };
}

function conversationNode(state: typeof ConversationState.State) {
  const newMessage = `Message ${state.messages.length + 1}: New input`;
  const allMessages = [...state.messages, newMessage];
  
  // Truncate if necessary
  const { truncated, summary } = truncateMessages(allMessages, state.maxMessages);
  
  return {
    messages: truncated,
    summary: summary || state.summary
  };
}

const conversationGraph = new StateGraph(ConversationState)
  .addNode("conversation", conversationNode)
  .addEdge(START, "conversation")
  .addEdge("conversation", END)
  .compile();

// Usage with message management
const result = await conversationGraph.invoke({
  messages: ["Hello", "How are you?", "Tell me about AI"],
  maxMessages: 5,
  summary: ""
});
```

#### Recursive Step Processing

```typescript
// Handle recursive or iterative processing
const RecursiveState = Annotation.Root({
  data: Annotation<any>,
  iterations: Annotation<number>,
  maxIterations: Annotation<number>,
  converged: Annotation<boolean>,
  history: Annotation<any[]>
});

function recursiveProcessingNode(state: typeof RecursiveState.State) {
  const iterations = (state.iterations || 0) + 1;
  
  // Process data
  const processedData = processIteration(state.data, iterations);
  
  // Check convergence
  const converged = checkConvergence(state.data, processedData);
  
  // Update history
  const history = [...(state.history || []), {
    iteration: iterations,
    data: processedData,
    timestamp: Date.now()
  }];
  
  return {
    data: processedData,
    iterations,
    converged,
    history
  };
}

function processIteration(data: any, iteration: number): any {
  // Simulate iterative processing
  return {
    value: data.value ? data.value * 0.9 + 0.1 : 1.0,
    iteration,
    processed: true
  };
}

function checkConvergence(oldData: any, newData: any): boolean {
  if (!oldData.value || !newData.value) return false;
  return Math.abs(oldData.value - newData.value) < 0.001;
}

function shouldContinueRecursive(state: typeof RecursiveState.State) {
  if (state.converged) return END;
  if (state.iterations >= state.maxIterations) return END;
  return "continue";
}

const recursiveGraph = new StateGraph(RecursiveState)
  .addNode("process", recursiveProcessingNode)
  .addEdge(START, "process")
  .addConditionalEdges("process", shouldContinueRecursive, {
    continue: "process",
    [END]: END
  })
  .compile();

// Usage with recursive processing
const recursiveResult = await recursiveGraph.invoke({
  data: { value: 10.0 },
  iterations: 0,
  maxIterations: 100,
  converged: false,
  history: []
});

console.log(`Converged after ${recursiveResult.iterations} iterations`);
console.log(`Final value: ${recursiveResult.data.value}`);
```
