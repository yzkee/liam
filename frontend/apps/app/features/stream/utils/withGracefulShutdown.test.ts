import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withGracefulShutdown } from './withGracefulShutdown'

describe('withGracefulShutdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns function normally when signal is not aborted', async () => {
    const controller = new AbortController()
    const mockFn = vi.fn().mockResolvedValue(undefined)

    const wrappedFn = withGracefulShutdown(mockFn, 1000)
    const result = await wrappedFn(controller.signal)

    expect(result).toBeUndefined()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith(controller.signal)
  })

  it('runs function with grace period when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const mockFn = vi.fn().mockResolvedValue(undefined)

    const wrappedFn = withGracefulShutdown(mockFn, 2000)
    const resultPromise = wrappedFn(controller.signal)

    // Function should complete immediately without waiting for grace period
    const result = await resultPromise

    expect(result).toBeUndefined()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith(controller.signal)
  })

  it('throws error when grace period is exceeded', async () => {
    const controller = new AbortController()
    controller.abort()

    let mockResolve: (() => void) | undefined
    const mockFn = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        mockResolve = resolve
      })
    })

    const wrappedFn = withGracefulShutdown(mockFn, 1000)
    const resultPromise = wrappedFn(controller.signal)

    // Advance timers to trigger grace period timeout
    vi.advanceTimersByTime(1000)

    await expect(resultPromise).rejects.toThrow('Grace period exceeded')
    expect(mockFn).toHaveBeenCalledTimes(1)

    // Clean up the hanging promise
    mockResolve?.()
  })

  it('completes successfully when function finishes within grace period', async () => {
    const controller = new AbortController()
    controller.abort()

    const mockFn = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500) // Complete in 500ms
      })
    })

    const wrappedFn = withGracefulShutdown(mockFn, 1000)
    const resultPromise = wrappedFn(controller.signal)

    // Advance timers by 500ms - function should complete
    vi.advanceTimersByTime(500)

    const result = await resultPromise

    expect(result).toBeUndefined()
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('propagates function errors correctly', async () => {
    const controller = new AbortController()
    const testError = new Error('Function error')
    const mockFn = vi.fn().mockRejectedValue(testError)

    const wrappedFn = withGracefulShutdown(mockFn, 1000)

    await expect(wrappedFn(controller.signal)).rejects.toThrow('Function error')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('handles function errors even when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const testError = new Error('Function error')
    const mockFn = vi.fn().mockRejectedValue(testError)

    const wrappedFn = withGracefulShutdown(mockFn, 1000)

    await expect(wrappedFn(controller.signal)).rejects.toThrow('Function error')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
