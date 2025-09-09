export const parseToolArguments = (
  argumentsString: string,
): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(argumentsString)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}
