import Image from 'next/image'
import { cn } from '@/lib/utils'

type AspectRatio = 'square' | 'video' | '4/3' | '16/9' | '3/2' | 'auto'

type OptimizedImageProps = {
  src: string
  alt: string
  aspectRatio?: AspectRatio
  priority?: boolean
  className?: string
  sizes?: string
  quality?: number
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

const ASPECT_RATIO_CLASSES: Record<AspectRatio, string> = {
  square: 'aspect-square',
  video: 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-[16/9]',
  '3/2': 'aspect-[3/2]',
  auto: '',
}

/**
 * Optimized Image Component
 *
 * A wrapper around Next.js Image component with sensible defaults for the Finds platform.
 * Automatically handles responsive images, lazy loading, and proper sizing.
 *
 * @param src - Image URL (must be from configured remote patterns or local)
 * @param alt - Alt text for accessibility (required)
 * @param aspectRatio - Predefined aspect ratio (default: 'auto')
 * @param priority - Load image with priority (for above-the-fold images)
 * @param className - Additional CSS classes
 * @param sizes - Responsive sizes hint for the browser
 * @param quality - Image quality 1-100 (default: 85)
 * @param objectFit - How the image should be sized (default: 'cover')
 *
 * @example
 * // Auction card image
 * <OptimizedImage
 *   src={photo.url}
 *   alt="1967 Ford Mustang"
 *   aspectRatio="4/3"
 *   sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
 * />
 *
 * @example
 * // Hero image (above the fold)
 * <OptimizedImage
 *   src={heroImage}
 *   alt="Featured auction"
 *   aspectRatio="16/9"
 *   priority
 * />
 */
export function OptimizedImage({
  src,
  alt,
  aspectRatio = 'auto',
  priority = false,
  className,
  sizes,
  quality = 85,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const aspectClass = ASPECT_RATIO_CLASSES[aspectRatio]
  const objectFitClass = `object-${objectFit}`

  // Default responsive sizes if not provided
  const defaultSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'

  return (
    <div className={cn('relative overflow-hidden', aspectClass, className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes || defaultSizes}
        quality={quality}
        priority={priority}
        className={objectFitClass}
      />
    </div>
  )
}

/**
 * Fixed Size Image Component
 *
 * Use this when you need specific dimensions instead of responsive fill.
 *
 * @example
 * <OptimizedImageFixed
 *   src={thumbnail}
 *   alt="Thumbnail"
 *   width={128}
 *   height={128}
 * />
 */
export function OptimizedImageFixed({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  quality = 85,
  objectFit = 'cover',
}: {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
  quality?: number
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={quality}
      priority={priority}
      className={cn(`object-${objectFit}`, className)}
    />
  )
}
