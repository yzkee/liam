import { describe, expect, it, vi } from 'vitest'
import { createGraph } from './createGraph'

// Mock all the dependencies
vi.mock('@langchain/langgraph', () => ({
  END: Symbol('END'),
  START: Symbol('START'),
  StateGraph: vi.fn().mockImplementation(() => ({
    addNode: vi.fn().mockReturnThis(),
    addEdge: vi.fn().mockReturnThis(),
    addConditionalEdges: vi.fn().mockReturnThis(),
    compile: vi.fn().mockReturnValue({ compiled: true }),
  })),
}))

vi.mock('./chat/workflow/nodes', () => ({
  analyzeRequirementsNode: vi.fn(),
  designSchemaNode: vi.fn(),
  executeDdlNode: vi.fn(),
  finalizeArtifactsNode: vi.fn(),
  generateUsecaseNode: vi.fn(),
  prepareDmlNode: vi.fn(),
  validateSchemaNode: vi.fn(),
  webSearchNode: vi.fn(),
}))

vi.mock('./chat/workflow/shared/langGraphUtils', () => ({
  createAnnotations: vi.fn().mockReturnValue('mockAnnotations'),
}))

vi.mock('./db-agent/nodes/invokeSchemaDesignToolNode', () => ({
  invokeSchemaDesignToolNode: vi.fn(),
}))

vi.mock('./db-agent/routing/routeAfterDesignSchema', () => ({
  routeAfterDesignSchema: vi.fn(),
}))

describe('createGraph', () => {
  it('should create and return a compiled graph', () => {
    const result = createGraph()

    expect(result).toEqual({ compiled: true })
  })

  it('should create StateGraph with correct annotations', () => {
    const { StateGraph } = require('@langchain/langgraph')
    const {
      createAnnotations,
    } = require('./chat/workflow/shared/langGraphUtils')

    createGraph()

    expect(createAnnotations).toHaveBeenCalledOnce()
    expect(StateGraph).toHaveBeenCalledWith('mockAnnotations')
  })

  it('should add all required nodes with retry policy', () => {
    const mockGraph = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue({ compiled: true }),
    }

    const { StateGraph } = require('@langchain/langgraph')
    StateGraph.mockImplementation(() => mockGraph)

    const {
      webSearchNode,
      analyzeRequirementsNode,
      designSchemaNode,
      executeDdlNode,
      generateUsecaseNode,
      prepareDmlNode,
      validateSchemaNode,
      finalizeArtifactsNode,
    } = require('./chat/workflow/nodes')

    const {
      invokeSchemaDesignToolNode,
    } = require('./db-agent/nodes/invokeSchemaDesignToolNode')

    createGraph()

    const expectedRetryPolicy = {
      maxAttempts: process.env['NODE_ENV'] === 'test' ? 1 : 3,
    }

    // Verify all nodes are added with correct retry policy
    expect(mockGraph.addNode).toHaveBeenCalledWith('webSearch', webSearchNode, {
      retryPolicy: expectedRetryPolicy,
    })
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'analyzeRequirements',
      analyzeRequirementsNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'designSchema',
      designSchemaNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'invokeSchemaDesignTool',
      invokeSchemaDesignToolNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'executeDDL',
      executeDdlNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'generateUsecase',
      generateUsecaseNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'prepareDML',
      prepareDmlNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'validateSchema',
      validateSchemaNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'finalizeArtifacts',
      finalizeArtifactsNode,
      {
        retryPolicy: expectedRetryPolicy,
      },
    )
  })

  it('should add all required linear edges', () => {
    const mockGraph = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue({ compiled: true }),
    }

    const { StateGraph, START, END } = require('@langchain/langgraph')
    StateGraph.mockImplementation(() => mockGraph)

    createGraph()

    // Verify linear edges
    expect(mockGraph.addEdge).toHaveBeenCalledWith(START, 'webSearch')
    expect(mockGraph.addEdge).toHaveBeenCalledWith(
      'webSearch',
      'analyzeRequirements',
    )
    expect(mockGraph.addEdge).toHaveBeenCalledWith(
      'analyzeRequirements',
      'designSchema',
    )
    expect(mockGraph.addEdge).toHaveBeenCalledWith(
      'invokeSchemaDesignTool',
      'designSchema',
    )
    expect(mockGraph.addEdge).toHaveBeenCalledWith(
      'executeDDL',
      'generateUsecase',
    )
    expect(mockGraph.addEdge).toHaveBeenCalledWith(
      'generateUsecase',
      'prepareDML',
    )
    expect(mockGraph.addEdge).toHaveBeenCalledWith(
      'prepareDML',
      'validateSchema',
    )
    expect(mockGraph.addEdge).toHaveBeenCalledWith('finalizeArtifacts', END)
  })

  it('should add conditional edges for designSchema routing', () => {
    const mockGraph = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue({ compiled: true }),
    }

    const { StateGraph } = require('@langchain/langgraph')
    StateGraph.mockImplementation(() => mockGraph)

    const {
      routeAfterDesignSchema,
    } = require('./db-agent/routing/routeAfterDesignSchema')

    createGraph()

    // Verify conditional edge for designSchema
    expect(mockGraph.addConditionalEdges).toHaveBeenCalledWith(
      'designSchema',
      routeAfterDesignSchema,
      {
        invokeSchemaDesignTool: 'invokeSchemaDesignTool',
        executeDDL: 'executeDDL',
      },
    )
  })

  it('should add conditional edges for executeDDL with correct routing logic', () => {
    const mockGraph = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue({ compiled: true }),
    }

    const { StateGraph } = require('@langchain/langgraph')
    StateGraph.mockImplementation(() => mockGraph)

    createGraph()

    // Find the executeDDL conditional edge call
    const executeDDLCall = mockGraph.addConditionalEdges.mock.calls.find(
      (call) => call[0] === 'executeDDL',
    )

    expect(executeDDLCall).toBeDefined()
    expect(executeDDLCall[2]).toEqual({
      designSchema: 'designSchema',
      finalizeArtifacts: 'finalizeArtifacts',
      generateUsecase: 'generateUsecase',
    })

    // Test the routing function
    const routingFunction = executeDDLCall[1]

    // Test shouldRetryWithDesignSchema case
    expect(routingFunction({ shouldRetryWithDesignSchema: true })).toBe(
      'designSchema',
    )

    // Test ddlExecutionFailed case
    expect(routingFunction({ ddlExecutionFailed: true })).toBe(
      'finalizeArtifacts',
    )

    // Test success case
    expect(routingFunction({})).toBe('generateUsecase')
  })

  it('should add conditional edges for validateSchema with correct routing logic', () => {
    const mockGraph = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue({ compiled: true }),
    }

    const { StateGraph } = require('@langchain/langgraph')
    StateGraph.mockImplementation(() => mockGraph)

    createGraph()

    // Find the validateSchema conditional edge call
    const validateSchemaCall = mockGraph.addConditionalEdges.mock.calls.find(
      (call) => call[0] === 'validateSchema',
    )

    expect(validateSchemaCall).toBeDefined()
    expect(validateSchemaCall[2]).toEqual({
      designSchema: 'designSchema',
      finalizeArtifacts: 'finalizeArtifacts',
    })

    // Test the routing function
    const routingFunction = validateSchemaCall[1]

    // Test error case
    expect(routingFunction({ error: new Error('validation failed') })).toBe(
      'designSchema',
    )

    // Test success case
    expect(routingFunction({})).toBe('finalizeArtifacts')
  })

  it('should compile the graph and return the result', () => {
    const mockCompiled = { compiled: true, invoke: vi.fn() }
    const mockGraph = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue(mockCompiled),
    }

    const { StateGraph } = require('@langchain/langgraph')
    StateGraph.mockImplementation(() => mockGraph)

    const result = createGraph()

    expect(mockGraph.compile).toHaveBeenCalledOnce()
    expect(result).toBe(mockCompiled)
  })

  it('should use correct retry policy based on NODE_ENV', () => {
    const originalEnv = process.env['NODE_ENV']

    // Test with NODE_ENV = 'test'
    process.env['NODE_ENV'] = 'test'

    const mockGraph = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue({ compiled: true }),
    }

    const { StateGraph } = require('@langchain/langgraph')
    StateGraph.mockImplementation(() => mockGraph)

    createGraph()

    // Should use maxAttempts: 1 for test environment
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'webSearch',
      expect.any(Function),
      { retryPolicy: { maxAttempts: 1 } },
    )

    // Test with NODE_ENV = 'production'
    process.env['NODE_ENV'] = 'production'
    mockGraph.addNode.mockClear()

    createGraph()

    // Should use maxAttempts: 3 for non-test environment
    expect(mockGraph.addNode).toHaveBeenCalledWith(
      'webSearch',
      expect.any(Function),
      { retryPolicy: { maxAttempts: 3 } },
    )

    // Restore original environment
    process.env['NODE_ENV'] = originalEnv
  })
})
