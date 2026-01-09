'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Section {
  id: string
  label: string
}

interface UseScrollSpyOptions {
  threshold?: number
  headerOffset?: number
  throttleMs?: number
}

interface UseScrollSpyResult {
  activeSection: string
  isVisible: boolean
}

/**
 * Custom hook for scroll-based section detection and visibility tracking
 *
 * @param sections - Array of sections to track
 * @param options - Configuration options
 * @param options.threshold - Scroll position threshold for visibility (default: 400)
 * @param options.headerOffset - Offset for calculating section position (default: window.innerHeight / 3)
 * @param options.throttleMs - Throttle delay for scroll handler in ms (default: 100)
 * @returns Object containing activeSection and isVisible state
 */
export function useScrollSpy(
  sections: Section[],
  options: UseScrollSpyOptions = {}
): UseScrollSpyResult {
  const {
    threshold = 400,
    headerOffset,
    throttleMs = 100,
  } = options

  const [activeSection, setActiveSection] = useState<string>('')
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

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

    const handleScroll = () => {
      throttle(() => {
        if (!isMountedRef.current) {return}

        // Update visibility based on threshold
        const shouldBeVisible = window.scrollY > threshold
        setIsVisible(shouldBeVisible)

        // Calculate scroll position for section detection
        const offset = headerOffset ?? window.innerHeight / 3
        const scrollPosition = window.scrollY + offset

        // Find active section (iterate in reverse for bottom-up detection)
        for (let i = sections.length - 1; i >= 0; i--) {
          const section = document.getElementById(sections[i].id)
          if (section && section.offsetTop <= scrollPosition) {
            setActiveSection(sections[i].id)
            break
          }
        }
      })
    }

    // Initial check
    handleScroll()

    // Add scroll listener with passive flag for better performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      isMountedRef.current = false
      window.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [sections, threshold, headerOffset, throttle])

  return {
    activeSection,
    isVisible,
  }
}
