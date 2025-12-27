/**
 * System Configuration Service
 *
 * Manages runtime-configurable settings stored in the database.
 * Falls back to environment variables and hardcoded defaults.
 * Includes in-memory caching for performance.
 */

import { prisma } from '@/lib/db'
import { DEFAULT_AI_MODERATION_CONFIG, type AIModerationConfig } from './contracts/ai-moderation.interface'
import { LICENSE_PLATE_CONFIG } from '@/config/license-plate.config'

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface LicensePlateConfigType {
  visionModel: string
  temperature: number
  maxTokens: number
  confidenceThreshold: number
  blurRadius: number
  marginExpansion: number
  maxRetries: number
  retryBaseDelay: number
  defaultConcurrency: number
}

export interface AISettingsResponse {
  moderation: AIModerationConfig
  licensePlate: LicensePlateConfigType
  updatedAt: string | null
  updatedBy: string | null
}

// Cache configuration
const CACHE_TTL_MS = 60_000 // 1 minute
const cache = new Map<string, { value: unknown; expiresAt: number }>()

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Get a configuration value by key with caching
 */
export async function getConfig<T>(key: string): Promise<T | null> {
  // Check cache first
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T
  }

  const config = await prisma.systemConfig.findUnique({
    where: { key },
  })

  if (config) {
    // Update cache
    cache.set(key, {
      value: config.value as T,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
    return config.value as T
  }

  return null
}

/**
 * Audit metadata for tracking config changes
 */
export interface AuditMetadata {
  ipAddress?: string
  userAgent?: string
}

/**
 * Set a configuration value and log the change
 * Saves previous value to history for rollback capability
 */
export async function setConfig<T>(
  key: string,
  value: T,
  userId?: string,
  metadata?: AuditMetadata
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get existing config to save to history
    const existing = await tx.systemConfig.findUnique({
      where: { key },
    })

    // Upsert the config
    const config = await tx.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: value as object,
        updatedBy: userId,
      },
      update: {
        value: value as object,
        updatedBy: userId,
      },
    })

    // Save previous value to history if it existed
    if (existing) {
      await tx.systemConfigHistory.create({
        data: {
          configId: config.id,
          key: existing.key,
          value: existing.value as object,
          changedBy: userId,
        },
      })
    }

    // Log to audit trail with full metadata
    if (userId) {
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_CONFIG',
          resourceType: 'SystemConfig',
          resourceId: key,
          actorId: userId,
          actorIp: metadata?.ipAddress,
          actorUserAgent: metadata?.userAgent,
          details: {
            previousValue: existing?.value,
            newValue: value,
          } as object,
        },
      })
    }
  })

  // Invalidate cache
  cache.delete(key)
}

/**
 * Clear a specific config key from cache
 */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear all cached configs
 */
export function clearCache(): void {
  cache.clear()
}

// ============================================================================
// AI MODERATION CONFIG
// ============================================================================

const AI_MODERATION_KEY = 'ai.moderation'

/**
 * Get AI moderation configuration with fallbacks
 */
export async function getAIModerationConfig(): Promise<AIModerationConfig> {
  const dbConfig = await getConfig<Partial<AIModerationConfig>>(AI_MODERATION_KEY)

  // Merge DB config with defaults (DB values take precedence)
  return {
    ...DEFAULT_AI_MODERATION_CONFIG,
    ...dbConfig,
  }
}

/**
 * Update AI moderation configuration
 */
export async function setAIModerationConfig(
  config: Partial<AIModerationConfig>,
  userId?: string,
  metadata?: AuditMetadata
): Promise<void> {
  // Get existing config to merge
  const existing = await getConfig<Partial<AIModerationConfig>>(AI_MODERATION_KEY) || {}

  // Merge and save
  await setConfig(AI_MODERATION_KEY, {
    ...existing,
    ...config,
  }, userId, metadata)
}

// ============================================================================
// LICENSE PLATE CONFIG
// ============================================================================

const LICENSE_PLATE_KEY = 'ai.licensePlate'

/**
 * Get license plate detection configuration with fallbacks
 */
export async function getLicensePlateConfig(): Promise<LicensePlateConfigType> {
  const dbConfig = await getConfig<Partial<LicensePlateConfigType>>(LICENSE_PLATE_KEY)

  // Merge DB config with env/defaults (DB values take precedence)
  return {
    visionModel: dbConfig?.visionModel ?? LICENSE_PLATE_CONFIG.visionModel,
    temperature: dbConfig?.temperature ?? LICENSE_PLATE_CONFIG.temperature,
    maxTokens: dbConfig?.maxTokens ?? LICENSE_PLATE_CONFIG.maxTokens,
    confidenceThreshold: dbConfig?.confidenceThreshold ?? LICENSE_PLATE_CONFIG.confidenceThreshold,
    blurRadius: dbConfig?.blurRadius ?? LICENSE_PLATE_CONFIG.blurRadius,
    marginExpansion: dbConfig?.marginExpansion ?? LICENSE_PLATE_CONFIG.marginExpansion,
    maxRetries: dbConfig?.maxRetries ?? LICENSE_PLATE_CONFIG.maxRetries,
    retryBaseDelay: dbConfig?.retryBaseDelay ?? LICENSE_PLATE_CONFIG.retryBaseDelay,
    defaultConcurrency: dbConfig?.defaultConcurrency ?? LICENSE_PLATE_CONFIG.defaultConcurrency,
  }
}

/**
 * Update license plate detection configuration
 */
export async function setLicensePlateConfig(
  config: Partial<LicensePlateConfigType>,
  userId?: string,
  metadata?: AuditMetadata
): Promise<void> {
  // Get existing config to merge
  const existing = await getConfig<Partial<LicensePlateConfigType>>(LICENSE_PLATE_KEY) || {}

  // Merge and save
  await setConfig(LICENSE_PLATE_KEY, {
    ...existing,
    ...config,
  }, userId, metadata)
}

// ============================================================================
// COMBINED AI SETTINGS
// ============================================================================

/**
 * Get all AI settings for admin UI
 * Optimized: single batch query instead of N+1 queries
 */
export async function getAllAISettings(): Promise<AISettingsResponse> {
  // Single batch query for all config records
  const records = await prisma.systemConfig.findMany({
    where: {
      key: { in: [AI_MODERATION_KEY, LICENSE_PLATE_KEY] }
    }
  })

  const moderationRecord = records.find(r => r.key === AI_MODERATION_KEY)
  const licensePlateRecord = records.find(r => r.key === LICENSE_PLATE_KEY)

  // Merge with defaults (DB values take precedence)
  const moderation: AIModerationConfig = {
    ...DEFAULT_AI_MODERATION_CONFIG,
    ...(moderationRecord?.value as Partial<AIModerationConfig> || {}),
  }

  const licensePlateDbConfig = licensePlateRecord?.value as Partial<LicensePlateConfigType> || {}
  const licensePlate: LicensePlateConfigType = {
    visionModel: licensePlateDbConfig.visionModel ?? LICENSE_PLATE_CONFIG.visionModel,
    temperature: licensePlateDbConfig.temperature ?? LICENSE_PLATE_CONFIG.temperature,
    maxTokens: licensePlateDbConfig.maxTokens ?? LICENSE_PLATE_CONFIG.maxTokens,
    confidenceThreshold: licensePlateDbConfig.confidenceThreshold ?? LICENSE_PLATE_CONFIG.confidenceThreshold,
    blurRadius: licensePlateDbConfig.blurRadius ?? LICENSE_PLATE_CONFIG.blurRadius,
    marginExpansion: licensePlateDbConfig.marginExpansion ?? LICENSE_PLATE_CONFIG.marginExpansion,
    maxRetries: licensePlateDbConfig.maxRetries ?? LICENSE_PLATE_CONFIG.maxRetries,
    retryBaseDelay: licensePlateDbConfig.retryBaseDelay ?? LICENSE_PLATE_CONFIG.retryBaseDelay,
    defaultConcurrency: licensePlateDbConfig.defaultConcurrency ?? LICENSE_PLATE_CONFIG.defaultConcurrency,
  }

  // Get the most recent update timestamp
  const updates = records
    .map(r => r.updatedAt)
    .filter((d): d is Date => d !== null && d !== undefined)
    .sort((a, b) => b.getTime() - a.getTime())

  return {
    moderation,
    licensePlate,
    updatedAt: updates[0]?.toISOString() || null,
    updatedBy: moderationRecord?.updatedBy || licensePlateRecord?.updatedBy || null,
  }
}

/**
 * Update all AI settings at once
 */
export async function updateAllAISettings(
  settings: {
    moderation?: Partial<AIModerationConfig>
    licensePlate?: Partial<LicensePlateConfigType>
  },
  userId?: string,
  metadata?: AuditMetadata
): Promise<void> {
  if (settings.moderation) {
    await setAIModerationConfig(settings.moderation, userId, metadata)
  }
  if (settings.licensePlate) {
    await setLicensePlateConfig(settings.licensePlate, userId, metadata)
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate AI moderation config values
 */
export function validateAIModerationConfig(
  config: Partial<AIModerationConfig>
): ValidationError[] {
  const errors: ValidationError[] = []

  // Threshold validations (0-1)
  const thresholdFields: (keyof AIModerationConfig)[] = [
    'commentAutoApproveThreshold',
    'commentAutoRejectThreshold',
    'listingFlagThreshold',
    'suspicionScoreThreshold',
  ]

  for (const field of thresholdFields) {
    const value = config[field]
    if (value !== undefined && (typeof value !== 'number' || value < 0 || value > 1)) {
      errors.push({ field, message: `${field} must be between 0 and 1` })
    }
  }

  // Integer validations
  if (config.bidAnalysisWindowMinutes !== undefined) {
    const val = config.bidAnalysisWindowMinutes
    if (!Number.isInteger(val) || val < 15 || val > 1440) {
      errors.push({ field: 'bidAnalysisWindowMinutes', message: 'Must be between 15 and 1440 minutes' })
    }
  }

  if (config.maxRequestsPerMinute !== undefined) {
    const val = config.maxRequestsPerMinute
    if (!Number.isInteger(val) || val < 10 || val > 200) {
      errors.push({ field: 'maxRequestsPerMinute', message: 'Must be between 10 and 200' })
    }
  }

  // Model validations
  const validModels = [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'google/gemini-pro-1.5',
  ]

  if (config.defaultModel && !validModels.includes(config.defaultModel)) {
    errors.push({ field: 'defaultModel', message: 'Invalid model selection' })
  }

  if (config.visionModel && !validModels.includes(config.visionModel)) {
    errors.push({ field: 'visionModel', message: 'Invalid vision model selection' })
  }

  return errors
}

/**
 * Validate license plate config values
 */
export function validateLicensePlateConfig(
  config: Partial<LicensePlateConfigType>
): ValidationError[] {
  const errors: ValidationError[] = []

  if (config.confidenceThreshold !== undefined) {
    const val = config.confidenceThreshold
    if (typeof val !== 'number' || val < 0 || val > 1) {
      errors.push({ field: 'confidenceThreshold', message: 'Must be between 0 and 1' })
    }
  }

  if (config.temperature !== undefined) {
    const val = config.temperature
    if (typeof val !== 'number' || val < 0 || val > 1) {
      errors.push({ field: 'temperature', message: 'Must be between 0 and 1' })
    }
  }

  if (config.blurRadius !== undefined) {
    const val = config.blurRadius
    if (!Number.isInteger(val) || val < 10 || val > 100) {
      errors.push({ field: 'blurRadius', message: 'Must be between 10 and 100 pixels' })
    }
  }

  if (config.marginExpansion !== undefined) {
    const val = config.marginExpansion
    if (!Number.isInteger(val) || val < 0 || val > 50) {
      errors.push({ field: 'marginExpansion', message: 'Must be between 0 and 50 percent' })
    }
  }

  if (config.maxTokens !== undefined) {
    const val = config.maxTokens
    if (!Number.isInteger(val) || val < 256 || val > 4096) {
      errors.push({ field: 'maxTokens', message: 'Must be between 256 and 4096' })
    }
  }

  return errors
}

// ============================================================================
// CONFIG HISTORY & ROLLBACK
// ============================================================================

export interface ConfigHistoryEntry {
  id: string
  key: string
  value: unknown
  changedBy: string | null
  changedAt: Date
}

/**
 * Get configuration change history for a specific key
 */
export async function getConfigHistory(
  key: string,
  limit = 10
): Promise<ConfigHistoryEntry[]> {
  const config = await prisma.systemConfig.findUnique({
    where: { key },
    include: {
      history: {
        orderBy: { changedAt: 'desc' },
        take: limit,
      },
    },
  })

  if (!config) {
    return []
  }

  return config.history.map((h) => ({
    id: h.id,
    key: h.key,
    value: h.value,
    changedBy: h.changedBy,
    changedAt: h.changedAt,
  }))
}

/**
 * Rollback configuration to a previous version
 */
export async function rollbackConfig(
  key: string,
  historyId: string,
  userId: string,
  metadata?: AuditMetadata
): Promise<void> {
  const history = await prisma.systemConfigHistory.findUnique({
    where: { id: historyId },
    include: { config: true },
  })

  if (!history) {
    throw new Error('History entry not found')
  }

  if (history.key !== key) {
    throw new Error('History entry does not match config key')
  }

  // Use setConfig to apply the historical value (this will also save current as history)
  await setConfig(key, history.value as object, userId, metadata)
}

/**
 * Get all AI settings history for admin UI
 */
export async function getAllAISettingsHistory(
  limit = 20
): Promise<{ moderation: ConfigHistoryEntry[]; licensePlate: ConfigHistoryEntry[] }> {
  const [moderation, licensePlate] = await Promise.all([
    getConfigHistory(AI_MODERATION_KEY, limit),
    getConfigHistory(LICENSE_PLATE_KEY, limit),
  ])

  return { moderation, licensePlate }
}
