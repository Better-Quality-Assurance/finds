'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, Expand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ImageGalleryProps = {
  images: Array<{
    id: string
    url: string
    category: string | null
  }>
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
        <p className="text-muted-foreground">No images available</p>
      </div>
    )
  }

  const currentImage = images[currentIndex]

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToIndex = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <>
      {/* Main image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted" role="region" aria-label="Image gallery">
        <Image
          src={currentImage.url}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          priority={currentIndex === 0}
          className="object-contain"
          role="img"
        />

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={goToPrev}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
          </>
        )}

        {/* Fullscreen button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 bg-black/50 text-white hover:bg-black/70"
          onClick={() => setIsFullscreen(true)}
          aria-label="Enter fullscreen mode"
        >
          <Expand className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Image counter */}
        <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-sm text-white" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Viewing image </span>
          {currentIndex + 1} / {images.length}
        </div>

        {/* Category badge */}
        {currentImage.category && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            {currentImage.category.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Image thumbnails">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => goToIndex(index)}
              className={cn(
                'relative h-16 w-24 flex-shrink-0 overflow-hidden rounded border-2 transition-all',
                index === currentIndex
                  ? 'border-primary'
                  : 'border-transparent opacity-60 hover:opacity-100'
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : undefined}
              role="listitem"
            >
              <Image
                src={image.url}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" role="dialog" aria-modal="true" aria-label="Fullscreen image view">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20 z-10"
            onClick={() => setIsFullscreen(false)}
            aria-label="Close fullscreen"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </Button>

          <div className="relative w-full h-full">
            <Image
              src={currentImage.url}
              alt={`Image ${currentIndex + 1}`}
              fill
              sizes="100vw"
              priority
              className="object-contain"
              role="img"
            />
          </div>

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={goToPrev}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-8 w-8" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={goToNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-8 w-8" aria-hidden="true" />
              </Button>

              {/* Thumbnail strip */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/50 p-2 z-10" role="list" aria-label="Image thumbnails">
                {images.slice(0, 10).map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => goToIndex(index)}
                    className={cn(
                      'relative h-12 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all',
                      index === currentIndex
                        ? 'border-white'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                    aria-label={`View image ${index + 1}`}
                    aria-current={index === currentIndex ? 'true' : undefined}
                    role="listitem"
                  >
                    <Image
                      src={image.url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
                {images.length > 10 && (
                  <div className="flex h-12 w-16 items-center justify-center text-sm text-white" aria-hidden="true">
                    +{images.length - 10}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 right-4 rounded bg-black/70 px-3 py-1 text-white" aria-live="polite" aria-atomic="true">
            <span className="sr-only">Viewing image </span>
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  )
}
