/**
 * Predefined messages triggered by artifact-related events
 */
export const ARTIFACT_TRIGGER_MESSAGES = {
  REQUIREMENTS_ANALYZED: 'Your requirements have been analyzed and saved',
  USE_CASES_SAVED:
    'Your use cases have been saved and are ready for implementation',
} as const

/**
 * Role identifier for the project manager agent
 * Fixed value: 'pm' - must match backend API values
 */
export const PM_AGENT_ROLE = 'pm' as const

/**
 * Role identifier for the quality assurance agent
 * Fixed value: 'qa' - must match backend API values
 */
export const QA_AGENT_ROLE = 'qa' as const
