'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { UseFormReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Car, Wrench, Euro, Camera, AlertTriangle, Video } from 'lucide-react'
import { formatCurrency, calculateBuyerFee, calculateTotalWithFee } from '@/lib/utils'
import type { ListingFormData } from '../listing-form'
import { LISTING_RULES } from '@/domain/listing/rules'
import { cn } from '@/lib/utils'

type ReviewStepProps = {
  form: UseFormReturn<ListingFormData>
  listingId: string | null
}

type ListingMedia = {
  id: string
  publicUrl: string
  type: string
  category: string | null
  fileSize?: number
}

const CATEGORY_LABELS: Record<string, string> = {
  CLASSIC_CAR: 'Classic Car',
  RETRO_CAR: 'Retro Car',
  BARN_FIND: 'Barn Find',
  PROJECT_CAR: 'Project Car',
  MOTORCYCLE: 'Motorcycle',
  PARTS: 'Parts',
  MEMORABILIA: 'Memorabilia',
}

const COUNTRY_NAMES: Record<string, string> = {
  RO: 'Romania',
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  GB: 'United Kingdom',
  CH: 'Switzerland',
  NO: 'Norway',
}

const CONDITION_LABELS: Record<number, string> = {
  1: '1 - Parts only',
  2: '2 - Heavily deteriorated',
  3: '3 - Major restoration needed',
  4: '4 - Restoration project',
  5: '5 - Running but needs work',
  6: '6 - Driver quality',
  7: '7 - Good condition',
  8: '8 - Very good condition',
  9: '9 - Excellent condition',
  10: '10 - Concours/Show quality',
}

export function ReviewStep({ form, listingId }: ReviewStepProps) {
  const { watch } = form
  const values = watch()
  const [photos, setPhotos] = useState<ListingMedia[]>([])
  const [videos, setVideos] = useState<ListingMedia[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)

  // Fetch photos and videos for review
  useEffect(() => {
    if (listingId) {
      setIsLoadingMedia(true)
      fetch(`/api/listings/${listingId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.media) {
            setPhotos(data.media.filter((m: ListingMedia) => m.type === 'PHOTO'))
            setVideos(data.media.filter((m: ListingMedia) => m.type === 'VIDEO'))
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingMedia(false))
    }
  }, [listingId])

  const photoCount = photos.length
  const videoCount = videos.length
  const hasMinPhotos = photoCount >= LISTING_RULES.MIN_PHOTOS

  // Check required photo categories
  const photoCategories = new Set(photos.map((p) => p.category))
  const missingCategories = LISTING_RULES.REQUIRED_PHOTO_CATEGORIES.filter(
    (cat) => !photoCategories.has(cat)
  )

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const buyerFee = calculateBuyerFee(values.startingPrice || 0)
  const totalWithFee = calculateTotalWithFee(values.startingPrice || 0)

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Please review all the information below before submitting your listing
        for approval. Once submitted, our team will review it within 1-2
        business days.
      </p>

      {/* Warnings */}
      {(!hasMinPhotos || missingCategories.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h4 className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Issues to Address
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {!hasMinPhotos && (
              <li>
                • You have uploaded {photoCount} photos. Minimum required:{' '}
                {LISTING_RULES.MIN_PHOTOS}
              </li>
            )}
            {missingCategories.length > 0 && (
              <li>
                • Missing required photo categories:{' '}
                {missingCategories.join(', ')}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Title & Description */}
      <div className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold">{values.title || 'No title'}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {values.description || 'No description'}
        </p>
      </div>

      {/* Vehicle Info */}
      <div className="rounded-lg border p-4">
        <h4 className="flex items-center gap-2 font-medium">
          <Car className="h-4 w-4" />
          Vehicle Information
        </h4>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Category</dt>
            <dd className="font-medium">
              {CATEGORY_LABELS[values.category] || values.category}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Make</dt>
            <dd className="font-medium">{values.make || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Model</dt>
            <dd className="font-medium">{values.model || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Year</dt>
            <dd className="font-medium">{values.year || '-'}</dd>
          </div>
          {values.mileage && (
            <div>
              <dt className="text-sm text-muted-foreground">Mileage</dt>
              <dd className="font-medium">
                {values.mileage.toLocaleString()} {values.mileageUnit}
              </dd>
            </div>
          )}
          {values.vin && (
            <div>
              <dt className="text-sm text-muted-foreground">VIN</dt>
              <dd className="font-mono font-medium">{values.vin}</dd>
            </div>
          )}
          {values.registrationCountry && (
            <div>
              <dt className="text-sm text-muted-foreground">
                Registration Country
              </dt>
              <dd className="font-medium">{values.registrationCountry}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Condition */}
      <div className="rounded-lg border p-4">
        <h4 className="flex items-center gap-2 font-medium">
          <Wrench className="h-4 w-4" />
          Condition
        </h4>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Running</dt>
            <dd>
              <Badge variant={values.isRunning ? 'default' : 'secondary'}>
                {values.isRunning ? 'Yes, running' : 'Not running'}
              </Badge>
            </dd>
          </div>
          {values.conditionRating && (
            <div>
              <dt className="text-sm text-muted-foreground">
                Condition Rating
              </dt>
              <dd className="font-medium">
                {CONDITION_LABELS[values.conditionRating] ||
                  values.conditionRating}
              </dd>
            </div>
          )}
        </dl>
        {values.conditionNotes && (
          <div className="mt-4">
            <dt className="text-sm text-muted-foreground">Condition Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">
              {values.conditionNotes}
            </dd>
          </div>
        )}
        {values.knownIssues && (
          <div className="mt-4">
            <dt className="text-sm text-muted-foreground">Known Issues</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">
              {values.knownIssues}
            </dd>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="rounded-lg border p-4">
        <h4 className="flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4" />
          Location
        </h4>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Country</dt>
            <dd className="font-medium">
              {COUNTRY_NAMES[values.locationCountry] || values.locationCountry}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">City</dt>
            <dd className="font-medium">{values.locationCity || '-'}</dd>
          </div>
          {values.locationRegion && (
            <div>
              <dt className="text-sm text-muted-foreground">Region</dt>
              <dd className="font-medium">{values.locationRegion}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Pricing */}
      <div className="rounded-lg border p-4">
        <h4 className="flex items-center gap-2 font-medium">
          <Euro className="h-4 w-4" />
          Pricing
        </h4>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Starting Price</dt>
            <dd className="text-lg font-semibold">
              {formatCurrency(values.startingPrice || 0, values.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Reserve Price</dt>
            <dd className="font-medium">
              {values.reservePrice
                ? formatCurrency(values.reservePrice, values.currency)
                : 'No reserve'}
            </dd>
          </div>
        </dl>
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            If sold at starting price:
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Hammer price:</span>
              <span>
                {formatCurrency(values.startingPrice || 0, values.currency)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Buyer fee (5%):</span>
              <span>+{formatCurrency(buyerFee, values.currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-medium">
              <span>Buyer pays:</span>
              <span>{formatCurrency(totalWithFee, values.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="rounded-lg border p-4">
        <h4 className="flex items-center gap-2 font-medium">
          <Camera className="h-4 w-4" />
          Photos
        </h4>
        {isLoadingMedia ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : photos.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {photos.length} photos uploaded
              {!hasMinPhotos && (
                <span className="ml-2 text-amber-600">
                  ({LISTING_RULES.MIN_PHOTOS - photos.length} more needed)
                </span>
              )}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-6">
              {photos.slice(0, 12).map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden"
                >
                  <Image
                    src={photo.publicUrl}
                    alt={`Listing photo ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 25vw, 16vw"
                    className="object-cover"
                  />
                </div>
              ))}
              {photos.length > 12 && (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  +{photos.length - 12} more
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-amber-600">
            No photos uploaded. Please go back and add at least{' '}
            {LISTING_RULES.MIN_PHOTOS} photos.
          </p>
        )}
      </div>

      {/* Videos */}
      <div className="rounded-lg border p-4">
        <h4 className="flex items-center gap-2 font-medium">
          <Video className="h-4 w-4" />
          Videos
        </h4>
        {isLoadingMedia ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : videos.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {videos.length} videos uploaded
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {videos.map((video) => (
                <div key={video.id} className="overflow-hidden rounded-lg border bg-black">
                  <video
                    src={video.publicUrl}
                    controls
                    className="aspect-video w-full"
                    preload="metadata"
                  />
                  <div className="bg-muted p-2">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(video.fileSize)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No videos uploaded. Videos are optional but highly recommended to help buyers.
          </p>
        )}
      </div>

      {/* Terms reminder */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <h4 className="font-medium text-blue-800 dark:text-blue-200">
          Before You Submit
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <li>• Your listing will be reviewed within 1-2 business days</li>
          <li>• You may be asked to provide additional photos or information</li>
          <li>
            • By submitting, you confirm that all information is accurate
          </li>
          <li>
            • Once approved, your listing will go live for auction
          </li>
        </ul>
      </div>
    </div>
  )
}
