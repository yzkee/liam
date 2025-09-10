export const parseToolArguments = (
  argumentsString: string,
): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(argumentsString)
    // Check that it's an object, not null, and not an array
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}
