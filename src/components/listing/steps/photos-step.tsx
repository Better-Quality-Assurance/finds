'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Video as VideoIcon,
  Play,
} from 'lucide-react'
import { LISTING_RULES, type PhotoCategory } from '@/domain/listing/rules'
import { cn } from '@/lib/utils'

type PhotosStepProps = {
  listingId: string | null
}

type UploadedPhoto = {
  id: string
  url: string
  category: PhotoCategory
  filename: string
}

type UploadingPhoto = {
  id: string
  file: File
  preview: string
  category: PhotoCategory
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

type UploadedVideo = {
  id: string
  url: string
  filename: string
  fileSize: number
}

type UploadingVideo = {
  id: string
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior_front: 'Exterior - Front',
  exterior_rear: 'Exterior - Rear',
  exterior_left: 'Exterior - Left Side',
  exterior_right: 'Exterior - Right Side',
  exterior_detail: 'Exterior - Detail',
  interior_dashboard: 'Interior - Dashboard',
  interior_front_seats: 'Interior - Front Seats',
  interior_rear_seats: 'Interior - Rear Seats',
  interior_detail: 'Interior - Detail',
  engine_bay: 'Engine Bay',
  engine_detail: 'Engine - Detail',
  underbody: 'Underbody',
  trunk: 'Trunk',
  wheels: 'Wheels',
  vin_plate: 'VIN Plate',
  documentation: 'Documentation',
  defects: 'Defects/Issues',
  other: 'Other',
}

export function PhotosStep({ listingId }: PhotosStepProps) {
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState<UploadingPhoto[]>([])
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([])
  const [uploadingVideos, setUploadingVideos] = useState<UploadingVideo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const totalPhotos = uploadedPhotos.length + uploadingPhotos.filter(p => p.status === 'success').length
  const totalVideos = uploadedVideos.length + uploadingVideos.filter(v => v.status === 'success').length

  // Check which required categories are fulfilled
  const fulfilledCategories = new Set([
    ...uploadedPhotos.map((p) => p.category),
    ...uploadingPhotos.filter((p) => p.status === 'success').map((p) => p.category),
  ])
  const missingRequiredCategories = LISTING_RULES.REQUIRED_PHOTO_CATEGORIES.filter(
    (cat) => !fulfilledCategories.has(cat)
  )

  const uploadPhoto = async (file: File, category: PhotoCategory): Promise<void> => {
    if (!listingId) {
      toast.error('Please complete the previous steps first')
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const preview = URL.createObjectURL(file)

    // Add to uploading list
    setUploadingPhotos((prev) => [
      ...prev,
      {
        id: tempId,
        file,
        preview,
        category,
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
          category,
          type: 'PHOTO',
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
        throw new Error('Failed to upload file')
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

      // Update status
      setUploadingPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { ...p, status: 'success' as const, progress: 100 }
            : p
        )
      )

      // Add to uploaded list
      setUploadedPhotos((prev) => [
        ...prev,
        {
          id: media.id,
          url: media.publicUrl,
          category: media.category,
          filename: file.name,
        },
      ])

      // Remove from uploading list after a delay
      setTimeout(() => {
        setUploadingPhotos((prev) => prev.filter((p) => p.id !== tempId))
        URL.revokeObjectURL(preview)
      }, 2000)

    } catch (error) {
      setUploadingPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
                ...p,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : p
        )
      )
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Validate file count
      if (totalPhotos + acceptedFiles.length > LISTING_RULES.MAX_PHOTOS) {
        toast.error(`Maximum ${LISTING_RULES.MAX_PHOTOS} photos allowed`)
        return
      }

      // Validate each file
      for (const file of acceptedFiles) {
        // Check file type
        if (!(LISTING_RULES.ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}`)
          continue
        }

        // Check file size
        if (file.size > LISTING_RULES.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
          toast.error(`File too large: ${file.name} (max ${LISTING_RULES.MAX_PHOTO_SIZE_MB}MB)`)
          continue
        }

        // Upload with default category 'other'
        await uploadPhoto(file, 'other')
      }
    },
    [listingId, totalPhotos]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
    },
    maxSize: LISTING_RULES.MAX_PHOTO_SIZE_MB * 1024 * 1024,
  })

  const removePhoto = async (photoId: string) => {
    if (!listingId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/listings/${listingId}/media/${photoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      setUploadedPhotos((prev) => prev.filter((p) => p.id !== photoId))
      toast.success('Photo removed')
    } catch (error) {
      toast.error('Failed to remove photo')
    } finally {
      setIsLoading(false)
    }
  }

  const updatePhotoCategory = async (photoId: string, category: PhotoCategory) => {
    if (!listingId) return

    try {
      const response = await fetch(`/api/listings/${listingId}/media/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })

      if (!response.ok) {
        throw new Error('Failed to update category')
      }

      setUploadedPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, category } : p))
      )
    } catch (error) {
      toast.error('Failed to update category')
    }
  }

  const removeUploadingPhoto = (tempId: string) => {
    setUploadingPhotos((prev) => {
      const photo = prev.find((p) => p.id === tempId)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter((p) => p.id !== tempId)
    })
  }

  // Video upload functions
  const validateVideo = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!(LISTING_RULES.ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)) {
      return { valid: false, error: 'Invalid video format. Use MP4, MOV, or WebM.' }
    }

    // Check file size
    if (file.size > LISTING_RULES.MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      return {
        valid: false,
        error: `Video too large (max ${LISTING_RULES.MAX_VIDEO_SIZE_MB}MB)`,
      }
    }

    return { valid: true }
  }

  const uploadVideo = async (file: File): Promise<void> => {
    if (!listingId) {
      toast.error('Please complete the previous steps first')
      return
    }

    // Validate video
    const validation = validateVideo(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid video')
      return
    }

    const tempId = `temp-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const preview = URL.createObjectURL(file)

    // Add to uploading list
    setUploadingVideos((prev) => [
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
          type: 'VIDEO',
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
        throw new Error('Failed to upload video')
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

      // Update status
      setUploadingVideos((prev) =>
        prev.map((v) =>
          v.id === tempId
            ? { ...v, status: 'success' as const, progress: 100 }
            : v
        )
      )

      // Add to uploaded list
      setUploadedVideos((prev) => [
        ...prev,
        {
          id: media.id,
          url: media.publicUrl,
          filename: file.name,
          fileSize: file.size,
        },
      ])

      toast.success('Video uploaded successfully')

      // Remove from uploading list after a delay
      setTimeout(() => {
        setUploadingVideos((prev) => prev.filter((v) => v.id !== tempId))
        URL.revokeObjectURL(preview)
      }, 2000)
    } catch (error) {
      setUploadingVideos((prev) =>
        prev.map((v) =>
          v.id === tempId
            ? {
                ...v,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : v
        )
      )
      toast.error('Failed to upload video')
    }
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check video count limit
    if (totalVideos + files.length > LISTING_RULES.MAX_VIDEOS) {
      toast.error(`Maximum ${LISTING_RULES.MAX_VIDEOS} videos allowed`)
      return
    }

    // Upload each video
    for (const file of Array.from(files)) {
      await uploadVideo(file)
    }

    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const removeVideo = async (videoId: string) => {
    if (!listingId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/listings/${listingId}/media/${videoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete video')
      }

      setUploadedVideos((prev) => prev.filter((v) => v.id !== videoId))
      toast.success('Video removed')
    } catch (error) {
      toast.error('Failed to remove video')
    } finally {
      setIsLoading(false)
    }
  }

  const removeUploadingVideo = (tempId: string) => {
    setUploadingVideos((prev) => {
      const video = prev.find((v) => v.id === tempId)
      if (video) {
        URL.revokeObjectURL(video.preview)
      }
      return prev.filter((v) => v.id !== tempId)
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Photo Progress</h4>
            <p className="text-sm text-muted-foreground">
              {totalPhotos} of {LISTING_RULES.MIN_PHOTOS} minimum photos uploaded
            </p>
          </div>
          <div className="text-right">
            {totalPhotos >= LISTING_RULES.MIN_PHOTOS ? (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle className="h-4 w-4" />
                Minimum met
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {LISTING_RULES.MIN_PHOTOS - totalPhotos} more needed
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full transition-all',
              totalPhotos >= LISTING_RULES.MIN_PHOTOS
                ? 'bg-green-500'
                : 'bg-primary'
            )}
            style={{
              width: `${Math.min((totalPhotos / LISTING_RULES.MIN_PHOTOS) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Required categories checklist */}
      {missingRequiredCategories.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h4 className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-4 w-4" />
            Required Photos Missing
          </h4>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Please upload photos for these categories:
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-amber-700 dark:text-amber-300 md:grid-cols-2">
            {missingRequiredCategories.map((cat) => (
              <li key={cat} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {CATEGORY_LABELS[cat]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">
          {isDragActive ? 'Drop photos here...' : 'Drag & drop photos here'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to select files
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Accepted formats: JPG, PNG, WebP, HEIC • Max {LISTING_RULES.MAX_PHOTO_SIZE_MB}MB per file
        </p>
      </div>

      {/* Uploading photos */}
      {uploadingPhotos.length > 0 && (
        <div className="space-y-2">
          <Label>Uploading...</Label>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {uploadingPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative overflow-hidden rounded-lg border bg-muted aspect-square"
              >
                <Image
                  src={photo.preview}
                  alt="Uploading"
                  fill
                  sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  {photo.status === 'uploading' && (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  )}
                  {photo.status === 'success' && (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                  {photo.status === 'error' && (
                    <div className="text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                      <p className="mt-1 text-xs text-white">{photo.error}</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => removeUploadingPhoto(photo.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded photos */}
      {uploadedPhotos.length > 0 && (
        <div className="space-y-2">
          <Label>Uploaded Photos ({uploadedPhotos.length})</Label>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {uploadedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg border aspect-square"
              >
                <Image
                  src={photo.url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover"
                />

                {/* Remove button */}
                <button
                  onClick={() => removePhoto(photo.id)}
                  disabled={isLoading}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Category selector */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/75 p-2">
                  <Select
                    value={photo.category}
                    onValueChange={(value) =>
                      updatePhotoCategory(photo.id, value as PhotoCategory)
                    }
                  >
                    <SelectTrigger className="h-8 border-0 bg-transparent text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LISTING_RULES.PHOTO_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Required indicator */}
                {LISTING_RULES.REQUIRED_PHOTO_CATEGORIES.includes(
                  photo.category as typeof LISTING_RULES.REQUIRED_PHOTO_CATEGORIES[number]
                ) && (
                  <div className="absolute left-2 top-2">
                    <span className="rounded bg-green-500 px-1.5 py-0.5 text-xs font-medium text-white">
                      Required
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {uploadedPhotos.length === 0 && uploadingPhotos.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            No photos uploaded yet. Upload at least {LISTING_RULES.MIN_PHOTOS}{' '}
            photos to continue.
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-medium">Photo Tips</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>• Take photos in good natural lighting</li>
          <li>• Include all angles: front, rear, both sides</li>
          <li>• Photograph any defects, rust, or damage clearly</li>
          <li>• Include the VIN plate and documentation</li>
          <li>• Show the engine bay and underbody if possible</li>
          <li>• Photos should be clear, not blurry or dark</li>
        </ul>
      </div>

      {/* Video Section */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Videos (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              {totalVideos} of {LISTING_RULES.MAX_VIDEOS} videos uploaded
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => videoInputRef.current?.click()}
            disabled={totalVideos >= LISTING_RULES.MAX_VIDEOS || !listingId}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            multiple
            className="hidden"
            onChange={handleVideoSelect}
          />
        </div>

        {/* Video requirements */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <h4 className="font-medium text-blue-800 dark:text-blue-200">
            Video Requirements
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>• Maximum {LISTING_RULES.MAX_VIDEOS} videos</li>
            <li>• Up to {LISTING_RULES.MAX_VIDEO_SIZE_MB}MB per video</li>
            <li>• Maximum {LISTING_RULES.MAX_VIDEO_DURATION_SECONDS / 60} minutes duration</li>
            <li>• Formats: MP4, MOV, WebM</li>
          </ul>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            Recommended: Walkaround, cold start, driving footage, engine running
          </p>
        </div>

        {/* Uploading videos */}
        {uploadingVideos.length > 0 && (
          <div className="space-y-2">
            <Label>Uploading...</Label>
            <div className="grid gap-4 md:grid-cols-2">
              {uploadingVideos.map((video) => (
                <div
                  key={video.id}
                  className="relative overflow-hidden rounded-lg border bg-muted"
                >
                  <video
                    src={video.preview}
                    className="aspect-video w-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    {video.status === 'uploading' && (
                      <div className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
                        <p className="mt-2 text-xs text-white">
                          Uploading {formatFileSize(video.file.size)}...
                        </p>
                      </div>
                    )}
                    {video.status === 'success' && (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    )}
                    {video.status === 'error' && (
                      <div className="text-center p-4">
                        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                        <p className="mt-1 text-xs text-white">{video.error}</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                          onClick={() => removeUploadingVideo(video.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded videos */}
        {uploadedVideos.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Videos ({uploadedVideos.length})</Label>
            <div className="grid gap-4 md:grid-cols-2">
              {uploadedVideos.map((video) => (
                <div
                  key={video.id}
                  className="group relative overflow-hidden rounded-lg border bg-black"
                >
                  <video
                    src={video.url}
                    controls
                    className="aspect-video w-full"
                    preload="metadata"
                  />

                  {/* Remove button */}
                  <button
                    onClick={() => removeVideo(video.id)}
                    disabled={isLoading}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Video info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/75 p-2">
                    <p className="truncate text-xs text-white">{video.filename}</p>
                    <p className="text-xs text-white/75">
                      {formatFileSize(video.fileSize)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {uploadedVideos.length === 0 && uploadingVideos.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <VideoIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              No videos uploaded yet. Videos are optional but highly recommended.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add walkaround videos, cold starts, or driving footage to help buyers.
            </p>
          </div>
        )}

        {/* Video Tips */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="font-medium">Video Tips</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Record in landscape orientation (horizontal)</li>
            <li>• Film a complete walkaround of the vehicle</li>
            <li>• Show cold start and engine running</li>
            <li>• Include interior features and controls</li>
            <li>• Demonstrate any special features or issues</li>
            <li>• Keep videos steady and well-lit</li>
            <li>• Compress large videos before uploading if needed</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
