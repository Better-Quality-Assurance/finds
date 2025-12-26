'use client'

import { useState, useCallback } from 'react'
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
} from 'lucide-react'
import { LISTING_RULES, type PhotoCategory } from '@/domain/listing/rules'
import { cn } from '@/lib/utils'
import { useMediaUpload } from '@/hooks/useMediaUpload'
import { PHOTO_CATEGORY_LABELS } from '@/constants/listing-form'

type UploadedPhoto = {
  id: string
  url: string
  category: PhotoCategory
  filename: string
}

type PhotoUploaderProps = {
  listingId: string | null
  onPhotoUploaded?: (photo: UploadedPhoto) => void
}

export function PhotoUploader({ listingId, onPhotoUploaded }: PhotoUploaderProps) {
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { uploadingItems, uploadMedia, removeUploadingItem } = useMediaUpload({
    listingId,
    mediaType: 'PHOTO',
    category: 'other',
    onSuccess: (result) => {
      const newPhoto: UploadedPhoto = {
        id: result.id,
        url: result.url,
        category: 'other' as PhotoCategory,
        filename: result.filename,
      }
      setUploadedPhotos((prev) => [...prev, newPhoto])
      if (onPhotoUploaded) {
        onPhotoUploaded(newPhoto)
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const totalPhotos =
    uploadedPhotos.length +
    uploadingItems.filter((p) => p.status === 'success').length

  // Check which required categories are fulfilled
  const fulfilledCategories = new Set([
    ...uploadedPhotos.map((p) => p.category),
    ...uploadingItems
      .filter((p) => p.status === 'success')
      .map(() => 'other' as PhotoCategory),
  ])
  const missingRequiredCategories = LISTING_RULES.REQUIRED_PHOTO_CATEGORIES.filter(
    (cat) => !fulfilledCategories.has(cat)
  )

  const validatePhoto = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!(LISTING_RULES.ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
      return { valid: false, error: `Invalid file type: ${file.name}` }
    }

    // Check file size
    if (file.size > LISTING_RULES.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      return {
        valid: false,
        error: `File too large: ${file.name} (max ${LISTING_RULES.MAX_PHOTO_SIZE_MB}MB)`,
      }
    }

    return { valid: true }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Validate file count
      if (totalPhotos + acceptedFiles.length > LISTING_RULES.MAX_PHOTOS) {
        toast.error(`Maximum ${LISTING_RULES.MAX_PHOTOS} photos allowed`)
        return
      }

      // Validate and upload each file
      for (const file of acceptedFiles) {
        const validation = validatePhoto(file)
        if (!validation.valid) {
          toast.error(validation.error || 'Invalid file')
          continue
        }

        // Upload with default category 'other'
        await uploadMedia(file, 'other')
      }
    },
    [totalPhotos, uploadMedia]
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
              <span className="flex items-center gap-1 text-sm font-medium text-success">
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
              totalPhotos >= LISTING_RULES.MIN_PHOTOS ? 'bg-success' : 'bg-primary'
            )}
            style={{
              width: `${Math.min((totalPhotos / LISTING_RULES.MIN_PHOTOS) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Required categories checklist */}
      {missingRequiredCategories.length > 0 && (
        <div className="rounded-lg border border-warning/20 bg-warning/10 p-4">
          <h4 className="flex items-center gap-2 font-medium text-warning">
            <AlertCircle className="h-4 w-4" />
            Required Photos Missing
          </h4>
          <p className="mt-1 text-sm text-warning/80">
            Please upload photos for these categories:
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-warning/80 md:grid-cols-2">
            {missingRequiredCategories.map((cat) => (
              <li key={cat} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {PHOTO_CATEGORY_LABELS[cat]}
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
        <p className="mt-1 text-sm text-muted-foreground">or click to select files</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Accepted formats: JPG, PNG, WebP, HEIC • Max {LISTING_RULES.MAX_PHOTO_SIZE_MB}
          MB per file
        </p>
      </div>

      {/* Uploading photos */}
      {uploadingItems.length > 0 && (
        <div className="space-y-2">
          <Label>Uploading...</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {uploadingItems.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
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
                    <CheckCircle className="h-8 w-8 text-success" />
                  )}
                  {photo.status === 'error' && (
                    <div className="text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
                      <p className="mt-1 text-xs text-white">{photo.error}</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => removeUploadingItem(photo.id)}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {uploadedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg border"
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
                          {PHOTO_CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Required indicator */}
                {LISTING_RULES.REQUIRED_PHOTO_CATEGORIES.includes(
                  photo.category as (typeof LISTING_RULES.REQUIRED_PHOTO_CATEGORIES)[number]
                ) && (
                  <div className="absolute left-2 top-2">
                    <span className="rounded bg-success px-1.5 py-0.5 text-xs font-medium text-white">
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
      {uploadedPhotos.length === 0 && uploadingItems.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            No photos uploaded yet. Upload at least {LISTING_RULES.MIN_PHOTOS} photos to
            continue.
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
    </div>
  )
}
