import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'

export const convertRequirementsToPrompt = (
  requirements: AnalyzedRequirements,
): string => {
  // Convert testcases to prompt format
  return `Business Goal: ${requirements.goal}

Test Cases:
${Object.entries(requirements.testcases)
  .map(
    ([category, testcases]) =>
      `- ${category}: ${testcases.map((tc) => `${tc.title} (${tc.type})`).join(', ')}`,
  )
  .join('\n')}`.trim()
}
