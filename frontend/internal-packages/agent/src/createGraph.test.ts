import { describe, expect, it } from 'vitest'
import { createGraph } from './createGraph'

describe('createGraph', () => {
  it('should create and return a compiled graph', async () => {
    const compiledStateGraph = createGraph()
    const retryPolicy = compiledStateGraph.retryPolicy
    expect(retryPolicy).toBeDefined()
    const graph = await compiledStateGraph.getGraphAsync()
    const mermaid = graph.drawMermaid()
    expect(mermaid).toEqual(`%%{init: {'flowchart': {'curve': 'linear'}}}%%
graph TD;
	__start__([<p>__start__</p>]):::first
	webSearch(webSearch)
	analyzeRequirements(analyzeRequirements)
	designSchema(designSchema)
	invokeSchemaDesignTool(invokeSchemaDesignTool)
	executeDDL(executeDDL)
	generateUsecase(generateUsecase)
	prepareDML(prepareDML)
	validateSchema(validateSchema)
	finalizeArtifacts(finalizeArtifacts)
	__end__([<p>__end__</p>]):::last
	__start__ --> webSearch;
	analyzeRequirements --> designSchema;
	executeDDL --> generateUsecase;
	finalizeArtifacts --> __end__;
	generateUsecase --> prepareDML;
	invokeSchemaDesignTool --> designSchema;
	prepareDML --> validateSchema;
	webSearch --> analyzeRequirements;
	designSchema -.-> invokeSchemaDesignTool;
	designSchema -.-> executeDDL;
	executeDDL -.-> designSchema;
	executeDDL -.-> finalizeArtifacts;
	executeDDL -.-> generateUsecase;
	validateSchema -.-> designSchema;
	validateSchema -.-> finalizeArtifacts;
	classDef default fill:#f2f0ff,line-height:1.2;
	classDef first fill-opacity:0;
	classDef last fill:#bfb6fc;
`)
  })
})
