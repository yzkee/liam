# Multi-agent Systems

LangGraph enables sophisticated multi-agent architectures where multiple specialized agents collaborate to solve complex problems. This guide covers patterns for agent communication, supervision, and coordination.

## Agent Communication Patterns

### Agent-to-agent Messaging
Enable direct communication between agents through shared state and message passing.

```typescript
import { StateGraph, END } from '@langchain/langgraph'
import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages'

// Multi-agent state with message routing
interface MultiAgentState {
  messages: BaseMessage[]
  currentAgent: string
  agentResults: Record<string, any>
  sharedContext: any
}

// Agent communication through state updates
export async function agentCommunicationNode(
  state: MultiAgentState,
  agentName: string
) {
  const agentMessage = new AIMessage({
    content: `Agent ${agentName} processing...`,
    name: agentName
  })
  
  // Add agent's message to shared state
  return {
    ...state,
    messages: [...state.messages, agentMessage],
    currentAgent: agentName,
    agentResults: {
      ...state.agentResults,
      [agentName]: await processAgentTask(state)
    }
  }
}

// Route messages between agents
export function routeToNextAgent(state: MultiAgentState): string {
  const { currentAgent, agentResults } = state
  
  switch (currentAgent) {
    case 'leadAgent':
      return agentResults.leadAgent?.needsDbDesign ? 'dbAgent' : 'qaAgent'
    case 'dbAgent':
      return agentResults.dbAgent?.schemaComplete ? 'qaAgent' : 'pmAgent'
    case 'qaAgent':
      return agentResults.qaAgent?.testsComplete ? 'leadAgent' : END
    default:
      return 'leadAgent'
  }
}
```

### Shared State Management
Manage shared state across multiple agents with proper isolation and coordination.

```typescript
// Shared state with agent-specific sections
interface SharedAgentState {
  // Global shared data
  globalContext: {
    sessionId: string
    requirements: string[]
    currentPhase: string
  }
  
  // Agent-specific state sections
  leadAgent: {
    analysisResult: any
    nextAction: string
  }
  
  dbAgent: {
    schemaData: any
    operations: any[]
    validationStatus: string
  }
  
  qaAgent: {
    testCases: any[]
    testResults: any[]
    coverage: number
  }
  
  // Cross-agent communication
  messages: BaseMessage[]
  agentQueue: string[]
}

// Update shared state with agent isolation
export function updateSharedState(
  state: SharedAgentState,
  agentName: keyof SharedAgentState,
  updates: any
): SharedAgentState {
  return {
    ...state,
    [agentName]: {
      ...state[agentName],
      ...updates
    },
    globalContext: {
      ...state.globalContext,
      lastUpdatedBy: agentName,
      lastUpdatedAt: new Date().toISOString()
    }
  }
}
```

### Coordination Mechanisms
Implement coordination patterns for agent synchronization and workflow management.

```typescript
// Agent coordination with workflow phases
export class AgentCoordinator {
  private currentPhase: string = 'analysis'
  private activeAgents: Set<string> = new Set()
  
  async coordinateAgents(state: MultiAgentState): Promise<string> {
    const { currentPhase } = state.globalContext
    
    switch (currentPhase) {
      case 'analysis':
        return this.coordinateAnalysisPhase(state)
      case 'design':
        return this.coordinateDesignPhase(state)
      case 'validation':
        return this.coordinateValidationPhase(state)
      default:
        return END
    }
  }
  
  private async coordinateAnalysisPhase(state: MultiAgentState): Promise<string> {
    if (!state.leadAgent?.analysisComplete) {
      return 'leadAgent'
    }
    
    // Transition to design phase
    return this.transitionPhase(state, 'design')
  }
  
  private transitionPhase(state: MultiAgentState, newPhase: string): string {
    state.globalContext.currentPhase = newPhase
    return this.getNextAgentForPhase(newPhase)
  }
}

// Synchronization barriers for agent coordination
export async function agentSynchronizationBarrier(
  state: MultiAgentState,
  requiredAgents: string[]
): Promise<boolean> {
  const completedAgents = requiredAgents.filter(
    agent => state.agentResults[agent]?.status === 'complete'
  )
  
  return completedAgents.length === requiredAgents.length
}
```

## Supervisory Patterns

### Supervisor Agent Setup
Create a supervisor agent that orchestrates and manages other specialized agents.

```typescript
// Supervisor agent that manages workflow
export const createSupervisorGraph = (checkpointer?: BaseCheckpointSaver) => {
  const supervisorGraph = new StateGraph(workflowAnnotation)
  
  // Create specialized agent subgraphs
  const leadAgentSubgraph = createLeadAgentGraph(checkpointer)
  const dbAgentSubgraph = createDbAgentGraph(checkpointer)
  const qaAgentSubgraph = createQaAgentGraph(checkpointer)
  const pmAgentSubgraph = createPmAgentGraph(checkpointer)
  
  // Supervisor decision node
  const supervisorNode = async (state: WorkflowState, config: RunnableConfig) => {
    const { messages, currentPhase, agentResults } = state
    
    // Analyze current state and decide next action
    const decision = await makeSupervisorDecision(state)
    
    return {
      ...state,
      next: decision.nextAgent,
      supervisorInstructions: decision.instructions,
      priority: decision.priority
    }
  }
  
  // Add supervisor and agent nodes
  supervisorGraph
    .addNode('supervisor', supervisorNode)
    .addNode('leadAgent', leadAgentSubgraph)
    .addNode('dbAgent', dbAgentSubgraph)
    .addNode('qaAgent', qaAgentSubgraph)
    .addNode('pmAgent', pmAgentSubgraph)
  
  // Supervisor routing logic
  supervisorGraph
    .addEdge(START, 'supervisor')
    .addConditionalEdges('supervisor', (state) => state.next, {
      leadAgent: 'leadAgent',
      dbAgent: 'dbAgent',
      qaAgent: 'qaAgent',
      pmAgent: 'pmAgent',
      [END]: END
    })
  
  // All agents report back to supervisor
  supervisorGraph
    .addEdge('leadAgent', 'supervisor')
    .addEdge('dbAgent', 'supervisor')
    .addEdge('qaAgent', 'supervisor')
    .addEdge('pmAgent', 'supervisor')
  
  return checkpointer 
    ? supervisorGraph.compile({ checkpointer })
    : supervisorGraph.compile()
}
```

### Task Delegation
Implement task delegation patterns where the supervisor assigns work to specialized agents.

```typescript
// Task delegation with priority and capability matching
export async function delegateTask(
  state: WorkflowState,
  task: Task
): Promise<string> {
  const availableAgents = getAvailableAgents(state)
  const capableAgents = availableAgents.filter(agent => 
    agent.capabilities.includes(task.type)
  )
  
  if (capableAgents.length === 0) {
    throw new Error(`No capable agents for task type: ${task.type}`)
  }
  
  // Select best agent based on workload and expertise
  const selectedAgent = selectBestAgent(capableAgents, task)
  
  // Create delegation instructions
  const delegationInstructions = {
    taskId: task.id,
    assignedTo: selectedAgent.name,
    priority: task.priority,
    deadline: task.deadline,
    context: extractRelevantContext(state, task)
  }
  
  return {
    ...state,
    activeTasks: [...state.activeTasks, task],
    delegations: [...state.delegations, delegationInstructions],
    next: selectedAgent.name
  }
}

// Dynamic task redistribution
export function redistributeTasks(state: WorkflowState): WorkflowState {
  const overloadedAgents = state.agents.filter(agent => 
    agent.currentLoad > agent.capacity * 0.8
  )
  
  const underutilizedAgents = state.agents.filter(agent =>
    agent.currentLoad < agent.capacity * 0.5
  )
  
  // Redistribute tasks from overloaded to underutilized agents
  for (const overloadedAgent of overloadedAgents) {
    const redistributableTasks = overloadedAgent.tasks.filter(task =>
      task.priority < 'high' && task.canBeReassigned
    )
    
    for (const task of redistributableTasks) {
      const newAgent = findBestAgent(underutilizedAgents, task)
      if (newAgent) {
        reassignTask(task, overloadedAgent, newAgent)
      }
    }
  }
  
  return state
}
```

### Result Aggregation
Aggregate and synthesize results from multiple agents into coherent outputs.

```typescript
// Aggregate results from multiple agents
export async function aggregateAgentResults(
  state: WorkflowState
): Promise<AggregatedResult> {
  const { agentResults } = state
  
  // Collect results from all agents
  const leadResult = agentResults.leadAgent
  const dbResult = agentResults.dbAgent
  const qaResult = agentResults.qaAgent
  const pmResult = agentResults.pmAgent
  
  // Synthesize comprehensive result
  const aggregatedResult = {
    summary: synthesizeSummary([leadResult, dbResult, qaResult, pmResult]),
    
    schemaDesign: {
      tables: dbResult?.tables || [],
      relationships: dbResult?.relationships || [],
      constraints: dbResult?.constraints || [],
      validationStatus: qaResult?.validationStatus || 'pending'
    },
    
    testCoverage: {
      totalTests: qaResult?.testCases?.length || 0,
      passedTests: qaResult?.passedTests || 0,
      coverage: qaResult?.coverage || 0
    },
    
    requirements: {
      analyzed: leadResult?.analyzedRequirements || [],
      implemented: pmResult?.implementedFeatures || [],
      pending: pmResult?.pendingFeatures || []
    },
    
    recommendations: extractRecommendations(agentResults),
    nextSteps: determineNextSteps(agentResults)
  }
  
  return aggregatedResult
}

// Cross-agent result validation
export function validateCrossAgentConsistency(
  agentResults: Record<string, any>
): ValidationResult {
  const inconsistencies = []
  
  // Check schema consistency between DB and QA agents
  if (agentResults.dbAgent?.schema && agentResults.qaAgent?.testedSchema) {
    const schemaMatch = compareSchemas(
      agentResults.dbAgent.schema,
      agentResults.qaAgent.testedSchema
    )
    
    if (!schemaMatch.isConsistent) {
      inconsistencies.push({
        type: 'schema_mismatch',
        agents: ['dbAgent', 'qaAgent'],
        details: schemaMatch.differences
      })
    }
  }
  
  // Check requirement coverage between Lead and PM agents
  const requirementsCoverage = validateRequirementsCoverage(
    agentResults.leadAgent?.requirements,
    agentResults.pmAgent?.implementedFeatures
  )
  
  if (requirementsCoverage.gaps.length > 0) {
    inconsistencies.push({
      type: 'requirements_gap',
      agents: ['leadAgent', 'pmAgent'],
      details: requirementsCoverage.gaps
    })
  }
  
  return {
    isValid: inconsistencies.length === 0,
    inconsistencies
  }
}
```

## Multi-turn Conversations

### Cross-agent Conversations
Enable conversational interactions between agents for collaborative problem-solving.

```typescript
// Cross-agent conversation management
export class AgentConversationManager {
  private conversationHistory: Map<string, BaseMessage[]> = new Map()
  
  async facilitateConversation(
    fromAgent: string,
    toAgent: string,
    message: string,
    context: any
  ): Promise<BaseMessage> {
    const conversationKey = this.getConversationKey(fromAgent, toAgent)
    const history = this.conversationHistory.get(conversationKey) || []
    
    // Create message with conversation context
    const agentMessage = new AIMessage({
      content: message,
      name: fromAgent,
      additional_kwargs: {
        targetAgent: toAgent,
        conversationContext: context,
        messageType: 'agent_communication'
      }
    })
    
    // Update conversation history
    const updatedHistory = [...history, agentMessage]
    this.conversationHistory.set(conversationKey, updatedHistory)
    
    return agentMessage
  }
  
  async getConversationContext(
    agent1: string,
    agent2: string
  ): Promise<BaseMessage[]> {
    const key = this.getConversationKey(agent1, agent2)
    return this.conversationHistory.get(key) || []
  }
  
  private getConversationKey(agent1: string, agent2: string): string {
    return [agent1, agent2].sort().join('_')
  }
}

// Agent conversation node
export async function agentConversationNode(
  state: MultiAgentState,
  currentAgent: string
): Promise<MultiAgentState> {
  const conversationManager = new AgentConversationManager()
  
  // Check if current agent needs to communicate with others
  const communicationNeeds = analyzeCommunicationNeeds(state, currentAgent)
  
  for (const need of communicationNeeds) {
    const message = await generateAgentMessage(state, currentAgent, need)
    const conversationMessage = await conversationManager.facilitateConversation(
      currentAgent,
      need.targetAgent,
      message,
      need.context
    )
    
    state.messages.push(conversationMessage)
  }
  
  return state
}
```

### Context Preservation
Maintain conversation context across multiple agent interactions and turns.

```typescript
// Context preservation across agent turns
export class ConversationContextManager {
  private contextStore: Map<string, ConversationContext> = new Map()
  
  preserveContext(
    sessionId: string,
    agentName: string,
    context: any
  ): void {
    const key = `${sessionId}_${agentName}`
    const existingContext = this.contextStore.get(key) || {
      sessionId,
      agentName,
      history: [],
      sharedMemory: {},
      lastUpdated: new Date()
    }
    
    const updatedContext = {
      ...existingContext,
      history: [...existingContext.history, context],
      sharedMemory: {
        ...existingContext.sharedMemory,
        ...context.sharedData
      },
      lastUpdated: new Date()
    }
    
    this.contextStore.set(key, updatedContext)
  }
  
  retrieveContext(
    sessionId: string,
    agentName: string
  ): ConversationContext | null {
    const key = `${sessionId}_${agentName}`
    return this.contextStore.get(key) || null
  }
  
  getSharedContext(sessionId: string): any {
    const allContexts = Array.from(this.contextStore.values())
      .filter(ctx => ctx.sessionId === sessionId)
    
    // Merge shared memory from all agents
    return allContexts.reduce((shared, ctx) => ({
      ...shared,
      ...ctx.sharedMemory
    }), {})
  }
}

// Context-aware agent node
export async function contextAwareAgentNode(
  state: MultiAgentState,
  agentName: string
): Promise<MultiAgentState> {
  const contextManager = new ConversationContextManager()
  
  // Retrieve agent's conversation context
  const agentContext = contextManager.retrieveContext(
    state.sessionId,
    agentName
  )
  
  // Get shared context from all agents
  const sharedContext = contextManager.getSharedContext(state.sessionId)
  
  // Process with full context
  const result = await processWithContext(state, {
    agentContext,
    sharedContext,
    conversationHistory: state.messages
  })
  
  // Preserve updated context
  contextManager.preserveContext(state.sessionId, agentName, {
    result,
    timestamp: new Date(),
    sharedData: result.sharedUpdates
  })
  
  return result
}
```

### Turn Management
Manage conversation turns and ensure proper sequencing of agent interactions.

```typescript
// Turn-based conversation management
export class TurnManager {
  private turnQueue: string[] = []
  private currentTurn: string | null = null
  private turnHistory: TurnRecord[] = []
  
  initializeTurns(agents: string[], startingAgent?: string): void {
    this.turnQueue = [...agents]
    this.currentTurn = startingAgent || agents[0]
  }
  
  async executeTurn(
    state: MultiAgentState,
    agentName: string
  ): Promise<MultiAgentState> {
    if (this.currentTurn !== agentName) {
      throw new Error(`Not ${agentName}'s turn. Current turn: ${this.currentTurn}`)
    }
    
    const turnStart = new Date()
    
    // Execute agent's turn
    const result = await executeAgentTurn(state, agentName)
    
    // Record turn
    this.turnHistory.push({
      agent: agentName,
      startTime: turnStart,
      endTime: new Date(),
      result: result.summary,
      nextAgent: this.determineNextAgent(result)
    })
    
    // Advance to next turn
    this.advanceTurn(result)
    
    return result
  }
  
  private advanceTurn(result: MultiAgentState): void {
    // Determine next agent based on result
    const nextAgent = this.determineNextAgent(result)
    
    if (nextAgent) {
      this.currentTurn = nextAgent
      // Move current agent to end of queue if continuing
      if (this.turnQueue.includes(nextAgent)) {
        this.turnQueue = this.turnQueue.filter(a => a !== nextAgent)
        this.turnQueue.push(nextAgent)
      }
    } else {
      this.currentTurn = null // End conversation
    }
  }
  
  private determineNextAgent(state: MultiAgentState): string | null {
    // Logic to determine next agent based on state
    if (state.needsDbDesign) return 'dbAgent'
    if (state.needsValidation) return 'qaAgent'
    if (state.needsRequirementAnalysis) return 'pmAgent'
    if (state.needsCoordination) return 'leadAgent'
    
    return null // End conversation
  }
  
  getCurrentTurn(): string | null {
    return this.currentTurn
  }
  
  getTurnHistory(): TurnRecord[] {
    return [...this.turnHistory]
  }
}

// Turn-managed conversation node
export async function turnManagedConversation(
  state: MultiAgentState
): Promise<MultiAgentState> {
  const turnManager = new TurnManager()
  
  // Initialize turns if not already started
  if (!state.turnManager) {
    turnManager.initializeTurns(['leadAgent', 'dbAgent', 'qaAgent', 'pmAgent'])
    state.turnManager = turnManager
  }
  
  const currentAgent = state.turnManager.getCurrentTurn()
  
  if (!currentAgent) {
    // Conversation complete
    return { ...state, conversationComplete: true }
  }
  
  // Execute current agent's turn
  const result = await state.turnManager.executeTurn(state, currentAgent)
  
  return {
    ...result,
    currentTurn: state.turnManager.getCurrentTurn(),
    turnHistory: state.turnManager.getTurnHistory()
  }
}
```
