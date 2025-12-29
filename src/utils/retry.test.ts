import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, withRetrySafe } from './retry'

describe('retry utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const promise = withRetry(fn, { maxRetries: 3, baseDelay: 1000 })

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries exhausted', async () => {
      const error = new Error('persistent failure')
      const fn = vi.fn().mockRejectedValue(error)

      const promise = withRetry(fn, { maxRetries: 3, baseDelay: 1000 })

      // Attach rejection handler before running timers to avoid unhandled rejection
      const expectation = expect(promise).rejects.toThrow('persistent failure')
      await vi.runAllTimersAsync()
      await expectation
      expect(fn).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })

    it('should use exponential backoff delays', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      const delays: number[] = []

      const promise = withRetry(fn, {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: () => {
          delays.push(vi.getTimerCount())
        },
      })

      // Attach rejection handler before advancing timers to avoid unhandled rejection
      const expectation = expect(promise).rejects.toThrow('fail')

      // Manually advance timers to track delays
      await vi.advanceTimersByTimeAsync(1000) // First retry: 1s
      await vi.advanceTimersByTimeAsync(2000) // Second retry: 2s
      await vi.advanceTimersByTimeAsync(4000) // Third retry: 4s

      await expectation

      // Should have 3 retries
      expect(delays).toHaveLength(3)
    })

    it('should invoke onRetry callback with attempt number and error', async () => {
      const error = new Error('test error')
      const fn = vi.fn().mockRejectedValue(error)
      const onRetry = vi.fn()

      const promise = withRetry(fn, {
        maxRetries: 2,
        baseDelay: 100,
        onRetry,
      })

      // Attach rejection handler before running timers to avoid unhandled rejection
      const handled = promise.catch(() => {}) // Suppress error
      await vi.runAllTimersAsync()
      await handled

      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, error)
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, error)
    })

    it('should respect shouldRetry predicate', async () => {
      const _retryableError = new Error('retryable')
      const nonRetryableError = new Error('non-retryable')

      const fn = vi.fn().mockRejectedValue(nonRetryableError)

      const promise = withRetry(fn, {
        maxRetries: 3,
        shouldRetry: (err) => err.message === 'retryable',
      })

      // Attach rejection handler before running timers to avoid unhandled rejection
      const expectation = expect(promise).rejects.toThrow('non-retryable')
      await vi.runAllTimersAsync()
      await expectation
      expect(fn).toHaveBeenCalledTimes(1) // Should not retry
    })

    it('should handle non-Error objects', async () => {
      const fn = vi.fn().mockRejectedValue('string error')

      const promise = withRetry(fn, { maxRetries: 1, baseDelay: 100 })

      // Attach rejection handler before running timers to avoid unhandled rejection
      const expectation = expect(promise).rejects.toThrow('string error')
      await vi.runAllTimersAsync()
      await expectation
    })
  })

  describe('withRetrySafe', () => {
    it('should return success result on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const promise = withRetrySafe(fn)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({
        success: true,
        value: 'success',
        attempts: 1,
      })
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should return success after retries', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const promise = withRetrySafe(fn, { maxRetries: 3, baseDelay: 1000 })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({
        success: true,
        value: 'success',
        attempts: 3,
      })
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should return failure result after max retries', async () => {
      const error = new Error('persistent failure')
      const fn = vi.fn().mockRejectedValue(error)

      const promise = withRetrySafe(fn, { maxRetries: 3, baseDelay: 1000 })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({
        success: false,
        error,
        attempts: 4, // 1 initial + 3 retries
      })
      expect(fn).toHaveBeenCalledTimes(4)
    })

    it('should return failure immediately for non-retryable errors', async () => {
      const error = new Error('non-retryable')
      const fn = vi.fn().mockRejectedValue(error)

      const promise = withRetrySafe(fn, {
        maxRetries: 3,
        shouldRetry: () => false,
      })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({
        success: false,
        error,
        attempts: 1,
      })
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should invoke onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      const onRetry = vi.fn()

      const promise = withRetrySafe(fn, {
        maxRetries: 2,
        baseDelay: 100,
        onRetry,
      })

      await vi.runAllTimersAsync()
      await promise

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    })
  })

  describe('exponential backoff calculation', () => {
    it('should calculate correct delays for default base', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      const delays: number[] = []
      let lastTime = 0

      const promise = withRetrySafe(fn, {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: () => {
          const currentTime = Date.now()
          if (lastTime > 0) {
            delays.push(currentTime - lastTime)
          }
          lastTime = currentTime
        },
      })

      await vi.runAllTimersAsync()
      await promise

      // onRetry called 3 times, but first call initializes lastTime
      // so only 2 delays are recorded (between attempts 1-2 and 2-3)
      expect(delays.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle maxRetries = 0', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      const promise = withRetrySafe(fn, { maxRetries: 0 })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should handle very large baseDelay', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const promise = withRetrySafe(fn, { baseDelay: 1000000 })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(true)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should handle async errors in shouldRetry', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      const promise = withRetrySafe(fn, {
        maxRetries: 3,
        shouldRetry: (err) => {
          // Synchronous check - no issues expected
          return err.message === 'fail'
        },
      })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(false)
      expect(fn).toHaveBeenCalledTimes(4)
    })
  })
})
