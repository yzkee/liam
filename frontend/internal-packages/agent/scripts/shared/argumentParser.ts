/**
 * Parse a single argument with value
 */
const parseArgValue = (
  args: string[],
  index: number,
  argName: string,
  shortName: string,
): { value?: string; skip: boolean } => {
  const arg = args[index]
  if (!arg) return { skip: false }

  // Handle --flag=value format
  const longPrefix = `--${argName}=`
  const shortPrefix = `-${shortName}=`

  if (arg.startsWith(longPrefix)) {
    return { value: arg.slice(longPrefix.length), skip: false }
  }
  if (arg.startsWith(shortPrefix)) {
    return { value: arg.slice(shortPrefix.length), skip: false }
  }

  // Handle --flag value format
  if (arg === `--${argName}` || arg === `-${shortName}`) {
    const nextArg = args[index + 1]
    if (nextArg && !nextArg.startsWith('-')) {
      return { value: nextArg, skip: true }
    }
  }

  return { skip: false }
}

/**
 * Parse command line arguments for design process
 */
export const parseDesignProcessArgs = (): {
  prompt?: string
  threadId?: string
} => {
  const args = process.argv.slice(2)
  const result: { prompt?: string; threadId?: string } = {}

  for (let i = 0; i < args.length; i++) {
    // Parse prompt
    const promptResult = parseArgValue(args, i, 'prompt', 'p')
    if (promptResult.value !== undefined) {
      result.prompt = promptResult.value
      if (promptResult.skip) i++
      continue
    }

    // Parse thread-id
    const threadResult = parseArgValue(args, i, 'thread-id', 't')
    if (threadResult.value !== undefined) {
      const trimmed = threadResult.value.trim()
      if (trimmed) {
        result.threadId = trimmed
      } else {
        console.warn('Invalid thread ID provided - ignoring empty value')
      }
      if (threadResult.skip) i++
    }
  }

  return result
}

/**
 * Check if help flag is present
 */
export const hasHelpFlag = (): boolean => {
  const args = process.argv.slice(2)
  return args.includes('--help') || args.includes('-h')
}
