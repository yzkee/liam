type ToolDisplayInfo = {
  displayName: string
  description: string
}

export const getToolDisplayInfo = (toolName: string): ToolDisplayInfo => {
  switch (toolName) {
    case 'routeToAgent':
      return {
        displayName: 'Routing to Agent',
        description: 'Routing user request to specialized agent',
      }
    case 'schemaDesignTool':
      return {
        displayName: 'Database Schema Design',
        description: 'Applying database schema changes',
      }
    case 'saveRequirementsToArtifactTool':
      return {
        displayName: 'Save Requirements',
        description: 'Saving business and functional requirements',
      }
    case 'saveTestcasesAndDmlTool':
      return {
        displayName: 'Save Test Cases and DML',
        description: 'Saving test cases and data manipulation language',
      }
    default:
      return {
        displayName: toolName,
        description: '',
      }
  }
}
