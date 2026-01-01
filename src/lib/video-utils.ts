/**
 * Video Utilities
 * Client-side video metadata extraction and validation using HTML5 Video API
 */

export type VideoMetadata = {
  duration: number // seconds
  width: number
  height: number
  aspectRatio: number
}

export type VideoValidationResult = {
  isValid: boolean
  errors: string[]
  metadata?: VideoMetadata
}

// Default constraints
const DEFAULT_MAX_DURATION = 120 // 2 minutes
const DEFAULT_MIN_DURATION = 3 // 3 seconds

/**
 * Extract metadata from a video file using HTML5 Video API
 * Works client-side only (requires browser environment)
 */
export function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      reject(new Error('File is not a video'))
      return
    }

    const video = document.createElement('video')
    video.preload = 'metadata'

    const objectUrl = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight,
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load video metadata'))
    }

    video.src = objectUrl
  })
}

/**
 * Validate video duration
 */
export async function validateVideoDuration(
  file: File,
  options?: {
    maxDuration?: number
    minDuration?: number
  }
): Promise<VideoValidationResult> {
  const maxDuration = options?.maxDuration ?? DEFAULT_MAX_DURATION
  const minDuration = options?.minDuration ?? DEFAULT_MIN_DURATION
  const errors: string[] = []

  try {
    const metadata = await getVideoMetadata(file)

    if (metadata.duration < minDuration) {
      errors.push(`Video must be at least ${minDuration} seconds long (got ${Math.round(metadata.duration)}s)`)
    }

    if (metadata.duration > maxDuration) {
      errors.push(`Video must be no longer than ${maxDuration} seconds (got ${Math.round(metadata.duration)}s)`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      metadata,
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Failed to validate video'],
    }
  }
}

/**
 * Format video duration for display
 */
export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {return '0:00'}

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Check if file is a valid video type
 */
export function isVideoFile(file: File): boolean {
  const validTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
  ]

  return validTypes.includes(file.type) || file.type.startsWith('video/')
}

/**
 * Get recommended video constraints for the platform
 */
export function getVideoConstraints() {
  return {
    maxDuration: DEFAULT_MAX_DURATION,
    minDuration: DEFAULT_MIN_DURATION,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    acceptedFormats: ['mp4', 'webm', 'mov'],
    acceptedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  }
}
