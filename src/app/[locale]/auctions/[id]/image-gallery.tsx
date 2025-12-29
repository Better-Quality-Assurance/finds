'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // Keyboard navigation for fullscreen mode
  useEffect(() => {
    if (!isFullscreen) {return}

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          goToPrev()
          break
        case 'ArrowRight':
          event.preventDefault()
          goToNext()
          break
        case 'Escape':
          event.preventDefault()
          setIsFullscreen(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, goToPrev, goToNext])

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
        <p className="text-muted-foreground">No images available</p>
      </div>
    )
  }

  const currentImage = images[currentIndex]

  return (
    <>
      {/* Main image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted sm:rounded-xl" role="region" aria-label="Image gallery">
        <Image
          src={currentImage.url}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 800px"
          priority={currentIndex === 0}
          className="object-contain"
          role="img"
        />

        {/* Navigation arrows - larger touch targets on mobile */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 h-10 w-10 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 sm:left-2 sm:h-11 sm:w-11"
              onClick={goToPrev}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 sm:right-2 sm:h-11 sm:w-11"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </Button>
          </>
        )}

        {/* Fullscreen button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-9 w-9 bg-black/50 text-white hover:bg-black/70 sm:right-2 sm:top-2 sm:h-10 sm:w-10"
          onClick={() => setIsFullscreen(true)}
          aria-label="Enter fullscreen mode"
        >
          <Expand className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Image counter */}
        <div className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-0.5 text-xs text-white sm:bottom-2 sm:left-2 sm:py-1 sm:text-sm" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Viewing image </span>
          {currentIndex + 1} / {images.length}
        </div>

        {/* Category badge */}
        {currentImage.category && (
          <div className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white sm:bottom-2 sm:right-2 sm:px-2 sm:py-1 sm:text-xs">
            {currentImage.category.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* Thumbnails - horizontal scroll with touch-friendly sizing */}
      {images.length > 1 && (
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-2 sm:px-0" role="list" aria-label="Image thumbnails">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => goToIndex(index)}
              className={cn(
                'relative h-14 w-20 flex-shrink-0 overflow-hidden rounded border-2 transition-all sm:h-16 sm:w-24',
                index === currentIndex
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-transparent opacity-60 hover:opacity-100 active:opacity-100'
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : undefined}
              role="listitem"
            >
              <Image
                src={image.url}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="80px"
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
            className="absolute right-2 top-2 h-12 w-12 text-white hover:bg-white/20 sm:right-4 sm:top-4 z-10"
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
                className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20 sm:left-4 sm:h-14 sm:w-14"
                onClick={goToPrev}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20 sm:right-4 sm:h-14 sm:w-14"
                onClick={goToNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
              </Button>

              {/* Thumbnail strip */}
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/50 p-2 sm:bottom-4 z-10" role="list" aria-label="Image thumbnails">
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
