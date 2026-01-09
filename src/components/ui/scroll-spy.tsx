'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useScrollSpy } from '@/hooks/use-scroll-spy'

interface Section {
  id: string
  label: string
}

interface ScrollSpyProps {
  sections: Section[]
  threshold?: number
  headerOffset?: number
}

export function ScrollSpy({ sections, threshold, headerOffset }: ScrollSpyProps) {
  const [existingSections, setExistingSections] = useState<Section[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Check which sections actually exist in the DOM
  useEffect(() => {
    // Don't run on server
    if (typeof window === 'undefined') {return}

    const checkExistingSections = () => {
      const existing = sections.filter((section) => {
        const element = document.getElementById(section.id)
        return element !== null
      })
      setExistingSections(existing)
    }

    // Check immediately
    checkExistingSections()

    // Check again after a short delay to account for dynamic content
    const timeoutId = setTimeout(checkExistingSections, 100)

    return () => clearTimeout(timeoutId)
  }, [sections])

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const { activeSection, isVisible } = useScrollSpy(existingSections, {
    threshold,
    headerOffset,
  })

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80 // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })
    }
  }

  return (
    <nav
      className={cn(
        'fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex',
        !prefersReducedMotion && 'transition-all duration-300',
        isVisible
          ? 'translate-x-0 opacity-100'
          : 'pointer-events-none translate-x-4 opacity-0'
      )}
      aria-label="Page sections"
    >
      {existingSections.map((section) => (
        <button
          key={section.id}
          onClick={() => scrollToSection(section.id)}
          className="group relative flex items-center justify-end"
          aria-label={`Jump to ${section.label}`}
          aria-current={activeSection === section.id ? 'true' : undefined}
        >
          {/* Label tooltip */}
          <span
            className={cn(
              'absolute right-6 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium',
              'bg-foreground/90 text-background',
              'pointer-events-none',
              prefersReducedMotion
                ? 'opacity-0 group-hover:opacity-100'
                : 'opacity-0 transition-opacity group-hover:opacity-100'
            )}
          >
            {section.label}
          </span>

          {/* Dot */}
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              !prefersReducedMotion && 'transition-all duration-200',
              activeSection === section.id
                ? 'scale-125 bg-primary shadow-md shadow-primary/50'
                : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60'
            )}
          />
        </button>
      ))}
    </nav>
  )
}
