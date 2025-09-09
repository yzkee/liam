export const parseToolArguments = (
  argumentsString: string,
): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(argumentsString)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
