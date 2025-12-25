/**
 * Result of file upload
 */
export type UploadResult = {
  key: string
  url: string
  size: number
}

/**
 * Interface for storage service (R2/S3)
 * Handles file upload, deletion, and signed URL generation
 */
export interface IStorageService {
  /**
   * Upload file to storage
   */
  uploadToR2(file: Buffer, key: string, contentType: string): Promise<UploadResult>

  /**
   * Delete file from storage
   */
  deleteFromR2(key: string): Promise<void>

  /**
   * Generate signed URL for uploading
   */
  getSignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>

  /**
   * Generate signed URL for downloading
   */
  getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>

  /**
   * Generate media key for listings
   */
  generateMediaKey(listingId: string, type: 'photo' | 'video', filename: string): string

  /**
   * Generate thumbnail key from original key
   */
  generateThumbnailKey(originalKey: string): string
}
