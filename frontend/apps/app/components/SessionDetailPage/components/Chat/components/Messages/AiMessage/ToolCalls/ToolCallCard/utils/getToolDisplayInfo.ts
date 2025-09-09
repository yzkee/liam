type ToolDisplayInfo = {
  displayName: string
  description: string
  resultAction?: {
    label: string
    type: 'erd' | 'artifact' | 'testcases'
  }
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
        resultAction: {
          label: 'View ERD',
          type: 'erd',
        },
      }
    case 'saveRequirementsToArtifactTool':
      return {
        displayName: 'Save Requirements',
        description: 'Saving business and functional requirements',
        resultAction: {
          label: 'View Artifact',
          type: 'artifact',
        },
      }
    case 'saveTestcasesAndDmlTool':
      return {
        displayName: 'Save Test Cases and DML',
        description: 'Saving test cases and data manipulation language',
        resultAction: {
          label: 'View Test Cases',
          type: 'testcases',
        },
      }
    default:
      return {
        displayName: toolName,
        description: '',
      }
  }
}
