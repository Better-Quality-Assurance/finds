import '@testing-library/jest-dom'
import { expect, afterEach, vi, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Set up test environment variables
beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing'
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Global test configuration
expect.extend({})
