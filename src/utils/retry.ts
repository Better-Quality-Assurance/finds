/**
 * Retry utility with exponential backoff
 *
 * Provides a reusable mechanism for retrying async operations with configurable
 * retry attempts and exponential backoff delays.
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number

  /**
   * Base delay in milliseconds for exponential backoff (default: 1000)
   * Delays will be: baseDelay, baseDelay * 2, baseDelay * 4, etc.
   */
  baseDelay?: number

  /**
   * Optional callback invoked on each retry attempt
   * @param attempt - Current attempt number (1-indexed)
   * @param error - The error that triggered the retry
   */
  onRetry?: (attempt: number, error: Error) => void

  /**
   * Optional callback to determine if an error is retryable
   * @param error - The error to evaluate
   * @returns true if the operation should be retried, false otherwise
   */
  shouldRetry?: (error: Error) => boolean
}

export interface RetryResult<T> {
  /**
   * Indicates if the operation succeeded
   */
  success: boolean

  /**
   * The result value if successful
   */
  value?: T

  /**
   * The error if all retries failed
   */
  error?: Error

  /**
   * Number of attempts made (1 = succeeded on first try)
   */
  attempts: number
}

/**
 * Executes an async function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws The last error encountered if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await fetchData(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onRetry,
    shouldRetry = () => true,
  } = options

  let lastError: Error
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      attempt++

      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        throw lastError
      }

      // If we've exhausted all retries, throw the error
      if (attempt > maxRetries) {
        throw lastError
      }

      // Calculate exponential backoff delay: baseDelay * 2^(attempt-1)
      const delay = baseDelay * Math.pow(2, attempt - 1)

      // Invoke callback if provided
      if (onRetry) {
        onRetry(attempt, lastError)
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError!
}

/**
 * Executes an async function with retry logic, returning a result object
 * instead of throwing errors
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to a RetryResult object
 *
 * @example
 * ```typescript
 * const result = await withRetrySafe(
 *   async () => await processImage(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 *
 * if (result.success) {
 *   console.log('Result:', result.value);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts:', result.error);
 * }
 * ```
 */
export async function withRetrySafe<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onRetry,
    shouldRetry = () => true,
  } = options

  let lastError: Error | undefined
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      const value = await fn()
      return {
        success: true,
        value,
        attempts: attempt + 1,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      attempt++

      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        }
      }

      // If we've exhausted all retries, return failure
      if (attempt > maxRetries) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        }
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt - 1)

      // Invoke callback if provided
      if (onRetry) {
        onRetry(attempt, lastError)
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    error: lastError,
    attempts: attempt,
  }
}
