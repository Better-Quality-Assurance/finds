'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AdminMediaItem = {
  id: string
  publicUrl: string
  originalUrl: string | null
  thumbnailUrl: string | null
  type: 'PHOTO' | 'VIDEO'
  category: string | null
  caption: string | null
  position: number
  isPrimary: boolean
  licensePlateDetected: boolean
  licensePlateBlurred: boolean
  plateDetectionData: {
    confidence?: number
    boundingBoxes?: Array<{
      x: number
      y: number
      width: number
      height: number
    }>
  } | null
}

type AdminMediaViewerProps = {
  media: AdminMediaItem[]
  listingTitle?: string
}

export function AdminMediaViewer({ media, listingTitle }: AdminMediaViewerProps) {
  const [selectedMedia, setSelectedMedia] = useState<AdminMediaItem | null>(null)
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({})

  if (media.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No media uploaded</p>
        </CardContent>
      </Card>
    )
  }

  const toggleOriginal = (mediaId: string) => {
    setShowOriginal((prev) => ({ ...prev, [mediaId]: !prev[mediaId] }))
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {media.map((item) => {
          const isShowingOriginal = showOriginal[item.id] || false
          const hasLicensePlate = item.licensePlateDetected && item.originalUrl
          const displayUrl = (hasLicensePlate && isShowingOriginal ? item.originalUrl : item.publicUrl) || ''

          return (
            <Card key={item.id} className="group relative overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <Image
                    src={displayUrl}
                    alt={item.caption || `Media ${item.position}`}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-all group-hover:scale-105"
                  />

                  {/* Badge overlay for primary image */}
                  {item.isPrimary && (
                    <Badge className="absolute left-2 top-2 bg-blue-600">Primary</Badge>
                  )}

                  {/* License plate detection badge */}
                  {hasLicensePlate && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        'absolute right-2 top-2',
                        isShowingOriginal && 'bg-orange-600'
                      )}
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      {isShowingOriginal ? 'Original' : 'Blurred'}
                    </Badge>
                  )}

                  {/* View overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedMedia(item)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>

                {/* Media info footer */}
                <div className="border-t bg-muted/50 p-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      {item.category && (
                        <p className="truncate text-xs font-medium capitalize">
                          {item.category.replace('_', ' ')}
                        </p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {item.caption || `Position ${item.position}`}
                      </p>
                    </div>

                    {/* Toggle button for license plate images */}
                    {hasLicensePlate && (
                      <Button
                        size="sm"
                        variant={isShowingOriginal ? 'destructive' : 'outline'}
                        className="ml-2 h-7 px-2"
                        onClick={(e) => {
                          e.preventDefault()
                          toggleOriginal(item.id)
                        }}
                      >
                        {isShowingOriginal ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Full-size viewer dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl">
          {selectedMedia && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedMedia.category
                    ? selectedMedia.category.replace('_', ' ').toUpperCase()
                    : `Media ${selectedMedia.position}`}
                </DialogTitle>
                <DialogDescription>
                  {listingTitle && `From: ${listingTitle}`}
                  {selectedMedia.caption && ` - ${selectedMedia.caption}`}
                </DialogDescription>
              </DialogHeader>

              {/* License plate warning */}
              {selectedMedia.licensePlateDetected && selectedMedia.originalUrl && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-900">
                        License Plate Detected
                      </h4>
                      <p className="mt-1 text-sm text-orange-800">
                        This image contains a detected license plate. The public version has
                        been automatically blurred for privacy. As an admin, you can view the
                        original unblurred image.
                      </p>
                      {selectedMedia.plateDetectionData?.confidence && (
                        <p className="mt-2 text-xs text-orange-700">
                          Detection confidence:{' '}
                          {(selectedMedia.plateDetectionData.confidence * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Image viewer */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={
                    selectedMedia.licensePlateDetected &&
                    selectedMedia.originalUrl &&
                    showOriginal[selectedMedia.id]
                      ? selectedMedia.originalUrl
                      : selectedMedia.publicUrl
                  }
                  alt={selectedMedia.caption || `Media ${selectedMedia.position}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 896px"
                  className="object-contain"
                />
              </div>

              {/* Toggle controls for license plate images */}
              {selectedMedia.licensePlateDetected && selectedMedia.originalUrl && (
                <div className="flex items-center justify-center gap-4 border-t pt-4">
                  <Button
                    variant={!showOriginal[selectedMedia.id] ? 'default' : 'outline'}
                    onClick={() => toggleOriginal(selectedMedia.id)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Show Blurred (Public)
                  </Button>
                  <Button
                    variant={showOriginal[selectedMedia.id] ? 'destructive' : 'outline'}
                    onClick={() => toggleOriginal(selectedMedia.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Show Original (Admin Only)
                  </Button>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span className="font-medium">{selectedMedia.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Position:</span>{' '}
                  <span className="font-medium">{selectedMedia.position}</span>
                </div>
                {selectedMedia.category && (
                  <div>
                    <span className="text-muted-foreground">Category:</span>{' '}
                    <span className="font-medium capitalize">
                      {selectedMedia.category.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {selectedMedia.isPrimary && (
                  <div>
                    <Badge className="bg-blue-600">Primary Image</Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
