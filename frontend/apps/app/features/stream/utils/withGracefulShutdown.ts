export const withGracefulShutdown = (
  fn: (signal: AbortSignal) => Promise<void>,
  gracePeriodMs: number,
) => {
  return async (signal: AbortSignal): Promise<void> => {
    const fnPromise = fn(signal)

    // If signal is already aborted, apply grace period immediately
    if (signal.aborted) {
      return Promise.race([
        fnPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Grace period exceeded'))
          }, gracePeriodMs)
        }),
      ])
    }

    // If signal is not aborted yet, wait for it to be aborted or function to complete
    return Promise.race([
      fnPromise,
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => {
          // Once aborted, start grace period timer
          setTimeout(() => {
            reject(new Error('Grace period exceeded'))
          }, gracePeriodMs)
        })
      }),
    ])
  }
}
