'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackToTopProps {
  threshold?: number
  offset?: number
  throttleMs?: number
}

export function BackToTop({
  threshold = 400,
  offset = 0,
  throttleMs = 100,
}: BackToTopProps = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Throttle utility - limits execution frequency
   */
  const throttle = useCallback(
    (callback: () => void) => {
      if (timeoutRef.current) {return}

      callback()
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
      }, throttleMs)
    },
    [throttleMs]
  )

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {return}

    const toggleVisibility = () => {
      throttle(() => {
        setIsVisible(window.scrollY > threshold)
      })
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true })

    // Initial check
    toggleVisibility()

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [threshold, throttle])

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {return}

    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: offset,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full',
        'bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25',
        'hover:bg-primary hover:shadow-xl hover:shadow-primary/30',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        !prefersReducedMotion && 'transition-all duration-300 active:scale-95',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
