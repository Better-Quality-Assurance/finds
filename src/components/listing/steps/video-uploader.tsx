'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Upload,
  X,
  Video as VideoIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { LISTING_RULES } from '@/domain/listing/rules'
import { useMediaUpload } from '@/hooks/useMediaUpload'

type UploadedVideo = {
  id: string
  url: string
  filename: string
  fileSize: number
}

type VideoUploaderProps = {
  listingId: string | null
  onVideoUploaded?: (video: UploadedVideo) => void
}

export function VideoUploader({ listingId, onVideoUploaded }: VideoUploaderProps) {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const { uploadingItems, uploadMedia, removeUploadingItem } = useMediaUpload({
    listingId,
    mediaType: 'VIDEO',
    onSuccess: (result) => {
      const newVideo: UploadedVideo = {
        id: result.id,
        url: result.url,
        filename: result.filename,
        fileSize: result.fileSize,
      }
      setUploadedVideos((prev) => [...prev, newVideo])
      toast.success('Video uploaded successfully')
      if (onVideoUploaded) {
        onVideoUploaded(newVideo)
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const totalVideos =
    uploadedVideos.length +
    uploadingItems.filter((v) => v.status === 'success').length

  const validateVideo = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (
      !(LISTING_RULES.ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)
    ) {
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

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check video count limit
    if (totalVideos + files.length > LISTING_RULES.MAX_VIDEOS) {
      toast.error(`Maximum ${LISTING_RULES.MAX_VIDEOS} videos allowed`)
      return
    }

    // Validate and upload each video
    for (const file of Array.from(files)) {
      const validation = validateVideo(file)
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid video')
        continue
      }

      await uploadMedia(file)
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
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
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
        <h4 className="font-medium text-primary">
          Video Requirements
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-primary/80">
          <li>• Maximum {LISTING_RULES.MAX_VIDEOS} videos</li>
          <li>• Up to {LISTING_RULES.MAX_VIDEO_SIZE_MB}MB per video</li>
          <li>
            • Maximum {LISTING_RULES.MAX_VIDEO_DURATION_SECONDS / 60} minutes
            duration
          </li>
          <li>• Formats: MP4, MOV, WebM</li>
        </ul>
        <p className="mt-2 text-sm text-primary/80">
          Recommended: Walkaround, cold start, driving footage, engine running
        </p>
      </div>

      {/* Uploading videos */}
      {uploadingItems.length > 0 && (
        <div className="space-y-2">
          <Label>Uploading...</Label>
          <div className="grid gap-4 md:grid-cols-2">
            {uploadingItems.map((video) => (
              <div
                key={video.id}
                className="relative overflow-hidden rounded-lg border bg-muted"
              >
                <video src={video.preview} className="aspect-video w-full object-cover" muted />
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
                    <CheckCircle className="h-8 w-8 text-success" />
                  )}
                  {video.status === 'error' && (
                    <div className="p-4 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
                      <p className="mt-1 text-xs text-white">{video.error}</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => removeUploadingItem(video.id)}
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
                  <p className="text-xs text-white/75">{formatFileSize(video.fileSize)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {uploadedVideos.length === 0 && uploadingItems.length === 0 && (
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
  )
}
