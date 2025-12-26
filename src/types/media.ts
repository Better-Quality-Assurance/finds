// Media-related type definitions
// Centralized types for photo and video uploads, media management

import { PhotoCategory } from '@/domain/listing/rules'

/**
 * Successfully uploaded photo with metadata
 */
export type UploadedPhoto = {
  id: string
  url: string
  category: PhotoCategory
  filename: string
}

/**
 * Photo currently being uploaded with progress tracking
 */
export type UploadingPhoto = {
  id: string
  file: File
  preview: string
  category: PhotoCategory
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

/**
 * Successfully uploaded video with metadata
 */
export type UploadedVideo = {
  id: string
  url: string
  filename: string
  fileSize: number
}

/**
 * Video currently being uploaded with progress tracking
 */
export type UploadingVideo = {
  id: string
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

/**
 * Minimal media information for listing display
 */
export type ListingMedia = {
  id: string
  publicUrl: string
  type: string
  category: string | null
}
