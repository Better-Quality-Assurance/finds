import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export type MediaType = 'PHOTO' | 'VIDEO'

export type UploadStatus = 'uploading' | 'success' | 'error'

export interface UploadProgress {
  id: string
  file: File
  preview: string
  progress: number
  status: UploadStatus
  error?: string
}

export interface UploadResult {
  id: string
  url: string
  filename: string
  fileSize: number
}

interface UseMediaUploadOptions {
  listingId: string | null
  mediaType: MediaType
  onSuccess?: (result: UploadResult) => void
  onError?: (error: Error) => void
  category?: string
}

interface UseMediaUploadReturn {
  uploadingItems: UploadProgress[]
  uploadMedia: (file: File, category?: string) => Promise<void>
  removeUploadingItem: (tempId: string) => void
  isUploading: boolean
}

/**
 * Custom hook for handling media uploads (photos and videos) to R2 storage.
 * Manages upload state, progress tracking, and error handling.
 */
export function useMediaUpload({
  listingId,
  mediaType,
  onSuccess,
  onError,
  category,
}: UseMediaUploadOptions): UseMediaUploadReturn {
  const [uploadingItems, setUploadingItems] = useState<UploadProgress[]>([])

  const isUploading = uploadingItems.some((item) => item.status === 'uploading')

  const removeUploadingItem = useCallback((tempId: string) => {
    setUploadingItems((prev) => {
      const item = prev.find((i) => i.id === tempId)
      if (item) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((i) => i.id !== tempId)
    })
  }, [])

  const uploadMedia = useCallback(
    async (file: File, fileCategory?: string): Promise<void> => {
      if (!listingId) {
        toast.error('Please complete the previous steps first')
        return
      }

      const tempId = `temp-${mediaType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const preview = URL.createObjectURL(file)

      // Add to uploading list
      setUploadingItems((prev) => [
        ...prev,
        {
          id: tempId,
          file,
          preview,
          progress: 0,
          status: 'uploading',
        },
      ])

      try {
        // Get presigned upload URL
        const presignResponse = await fetch(`/api/listings/${listingId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            category: fileCategory || category,
            type: mediaType,
          }),
        })

        if (!presignResponse.ok) {
          throw new Error('Failed to get upload URL')
        }

        const { uploadUrl, key, mediaId } = await presignResponse.json()

        // Upload to R2
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${mediaType.toLowerCase()}`)
        }

        // Confirm upload
        const confirmResponse = await fetch(`/api/listings/${listingId}/media`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId }),
        })

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm upload')
        }

        const { media } = await confirmResponse.json()

        // Update status to success
        setUploadingItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, status: 'success' as const, progress: 100 }
              : item
          )
        )

        // Call success callback with upload result
        const result: UploadResult = {
          id: media.id,
          url: media.publicUrl,
          filename: file.name,
          fileSize: file.size,
        }

        if (onSuccess) {
          onSuccess(result)
        }

        // Remove from uploading list after a delay
        setTimeout(() => {
          setUploadingItems((prev) => prev.filter((item) => item.id !== tempId))
          URL.revokeObjectURL(preview)
        }, 2000)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed'

        setUploadingItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  status: 'error' as const,
                  error: errorMessage,
                }
              : item
          )
        )

        if (onError && error instanceof Error) {
          onError(error)
        }
      }
    },
    [listingId, mediaType, category, onSuccess, onError]
  )

  return {
    uploadingItems,
    uploadMedia,
    removeUploadingItem,
    isUploading,
  }
}
