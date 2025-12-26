'use client'

import { PhotoUploader } from './photo-uploader'
import { VideoUploader } from './video-uploader'

type PhotosStepProps = {
  listingId: string | null
}

/**
 * Main orchestrator component for the Photos step in the listing creation flow.
 * Delegates photo and video upload responsibilities to specialized components.
 *
 * Single Responsibility: Coordinate photo and video upload sections.
 */
export function PhotosStep({ listingId }: PhotosStepProps) {
  return (
    <div className="space-y-6">
      {/* Photo Upload Section */}
      <PhotoUploader listingId={listingId} />

      {/* Video Upload Section */}
      <div className="border-t pt-6">
        <VideoUploader listingId={listingId} />
      </div>
    </div>
  )
}
