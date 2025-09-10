type ToolDisplayInfo = {
  displayName: string
  description: string
  defaultSuccessMessage?: string
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
        defaultSuccessMessage: 'Database schema has been successfully designed and updated.',
        resultAction: {
          label: 'View ERD',
          type: 'erd',
        },
      }
    case 'saveRequirementsToArtifactTool':
      return {
        displayName: 'Save Requirements',
        description: 'Saving business and functional requirements',
        defaultSuccessMessage: 'Requirements have been successfully saved to artifact.',
        resultAction: {
          label: 'View Artifact',
          type: 'artifact',
        },
      }
    case 'saveTestcasesAndDmlTool':
      return {
        displayName: 'Save Test Cases and DML',
        description: 'Saving test cases with data manipulation language',
        defaultSuccessMessage: 'Test cases and DML have been successfully saved.',
        resultAction: {
          label: 'View Test Cases',
          type: 'testcases',
        },
      }
    case 'saveTestcase':
      return {
        displayName: 'Save Test Case',
        description: 'Saving a single test case with DML operation',
        defaultSuccessMessage: 'Test case has been successfully saved.',
        resultAction: {
          label: 'View Test Case',
          type: 'testcases',
        },
      }
    case 'runTestTool':
      return {
        displayName: 'Run Test Cases',
        description: 'Executing all test cases and validating results',
        defaultSuccessMessage: 'All test cases have been executed successfully.',
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
