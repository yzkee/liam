export const withGracefulShutdown = (
  fn: (signal: AbortSignal) => Promise<void>,
  gracePeriodMs: number,
) => {
  return async (signal: AbortSignal): Promise<void> => {
    console.log('[GRACEFUL] Starting graceful shutdown wrapper', {
      gracePeriodMs,
      alreadyAborted: signal.aborted
    })

    const fnPromise = fn(signal)

    // If signal is already aborted, apply grace period immediately
    if (signal.aborted) {
      console.log('[GRACEFUL] Signal already aborted, starting grace period immediately')
      return Promise.race([
        fnPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            console.log('[GRACEFUL] Grace period exceeded for already aborted signal')
            reject(new Error('Grace period exceeded'))
          }, gracePeriodMs)
        }),
      ])
    }

    // If signal is not aborted yet, wait for it to be aborted or function to complete
    console.log('[GRACEFUL] Signal not aborted, setting up abort listener')
    return Promise.race([
      fnPromise.then(result => {
        console.log('[GRACEFUL] Function completed normally')
        return result
      }).catch(err => {
        console.log('[GRACEFUL] Function failed:', err.message)
        throw err
      }),
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => {
          console.log('[GRACEFUL] Abort signal received, starting grace period')
          // Once aborted, start grace period timer
          setTimeout(() => {
            console.log('[GRACEFUL] Grace period exceeded after abort signal')
            reject(new Error('Grace period exceeded'))
          }, gracePeriodMs)
        })
      }),
    ])
  }
}
