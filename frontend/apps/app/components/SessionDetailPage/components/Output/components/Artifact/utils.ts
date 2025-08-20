// Common constants for Artifact component
export const EXECUTION_SECTION_TITLE = 'Execution History'
export const SUCCESS_ICON = '✅'
export const FAILURE_ICON = '❌'
export const SUCCESS_STATUS = 'Success'
export const FAILURE_STATUS = 'Failed'

export const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
