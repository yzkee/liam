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
        displayName: 'Save Test Case',
        description: 'Saving test case with data manipulation language',
        resultAction: {
          label: 'View Test Case',
          type: 'testcases',
        },
      }
    case 'saveTestcase':
      return {
        displayName: 'Save Test Case',
        description: 'Saving a single test case with DML operation',
        resultAction: {
          label: 'View Test Case',
          type: 'testcases',
        },
      }
    case 'runTestTool':
      return {
        displayName: 'Run Test Cases',
        description: 'Executing all test cases and validating results',
        resultAction: {
          label: 'View Test Results',
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
