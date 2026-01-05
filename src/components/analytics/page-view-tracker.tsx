'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const CONSENT_COOKIE_NAME = 'cookie-consent'

// Check if user has granted analytics consent
function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') {return false}

  try {
    const stored = localStorage.getItem(CONSENT_COOKIE_NAME)
    if (!stored) {return false}

    const parsed = JSON.parse(stored)
    return parsed.settings?.analytics === true
  } catch {
    return false
  }
}

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === 'undefined') {return ''}

  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Detect device type
function getDeviceType(): string {
  if (typeof window === 'undefined') {return 'unknown'}

  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) {return 'tablet'}
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {return 'mobile'}
  return 'desktop'
}

// Detect browser
function getBrowser(): string {
  if (typeof window === 'undefined') {return 'unknown'}

  const ua = navigator.userAgent
  if (ua.includes('Firefox')) {return 'Firefox'}
  if (ua.includes('SamsungBrowser')) {return 'Samsung'}
  if (ua.includes('Opera') || ua.includes('OPR')) {return 'Opera'}
  if (ua.includes('Trident')) {return 'IE'}
  if (ua.includes('Edge')) {return 'Edge'}
  if (ua.includes('Chrome')) {return 'Chrome'}
  if (ua.includes('Safari')) {return 'Safari'}
  return 'unknown'
}

// Detect OS
function getOS(): string {
  if (typeof window === 'undefined') {return 'unknown'}

  const ua = navigator.userAgent
  if (ua.includes('Win')) {return 'Windows'}
  if (ua.includes('Mac')) {return 'macOS'}
  if (ua.includes('Linux')) {return 'Linux'}
  if (ua.includes('Android')) {return 'Android'}
  if (ua.includes('like Mac')) {return 'iOS'}
  return 'unknown'
}

// Get page type from path
function getPageType(path: string): string {
  if (path === '/' || path === '/en' || path === '/ro') {return 'home'}
  if (path.includes('/auctions/')) {return 'auction'}
  if (path.includes('/auctions')) {return 'auction-list'}
  if (path.includes('/listings/')) {return 'listing'}
  if (path.includes('/sell')) {return 'sell'}
  if (path.includes('/account')) {return 'account'}
  if (path.includes('/admin')) {return 'admin'}
  if (path.includes('/login') || path.includes('/register')) {return 'auth'}
  if (path.includes('/legal')) {return 'legal'}
  return 'other'
}

// Extract resource ID from path
function getResourceId(path: string): string | undefined {
  // Match patterns like /auctions/xxx or /listings/xxx
  const auctionMatch = path.match(/\/auctions\/([a-zA-Z0-9]+)/)
  if (auctionMatch) {return auctionMatch[1]}

  const listingMatch = path.match(/\/listings\/([a-zA-Z0-9]+)/)
  if (listingMatch) {return listingMatch[1]}

  return undefined
}

// Get UTM parameters
function getUtmParams() {
  if (typeof window === 'undefined') {return {}}

  const params = new URLSearchParams(window.location.search)
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  }
}

interface PageViewTrackerProps {
  enabled?: boolean
}

export function PageViewTracker({ enabled = true }: PageViewTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pageViewIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const maxScrollRef = useRef<number>(0)
  const [hasConsent, setHasConsent] = useState(false)

  // Check consent on mount and when localStorage changes
  useEffect(() => {
    const checkConsent = () => {
      setHasConsent(hasAnalyticsConsent())
    }

    checkConsent()

    // Listen for storage changes (consent updates from other tabs)
    window.addEventListener('storage', checkConsent)

    // Also check periodically in case consent is granted in same tab
    const interval = setInterval(checkConsent, 2000)

    return () => {
      window.removeEventListener('storage', checkConsent)
      clearInterval(interval)
    }
  }, [])

  // Track scroll depth
  useEffect(() => {
    if (!enabled || !hasConsent || typeof window === 'undefined') {return}

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercent)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [enabled])

  // Send page view duration on page leave
  const sendDuration = useCallback(async () => {
    if (!pageViewIdRef.current) {return}

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
    const scrollDepth = maxScrollRef.current

    try {
      await fetch('/api/analytics/page-view', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageViewId: pageViewIdRef.current,
          duration,
          scrollDepth,
        }),
        // Use keepalive for page unload
        keepalive: true,
      })
    } catch {
      // Ignore errors on page leave
    }
  }, [])

  // Track page view
  useEffect(() => {
    if (!enabled || !hasConsent) {return}

    // Skip admin pages for tracking (optional - remove if you want to track admin)
    if (pathname?.includes('/admin')) {return}

    const trackPageView = async () => {
      // Send duration for previous page view
      if (pageViewIdRef.current) {
        await sendDuration()
      }

      // Reset for new page
      startTimeRef.current = Date.now()
      maxScrollRef.current = 0
      pageViewIdRef.current = null

      const path = pathname || '/'
      const sessionId = getSessionId()
      const pageType = getPageType(path)
      const resourceId = getResourceId(path)
      const utmParams = getUtmParams()

      try {
        const response = await fetch('/api/analytics/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            path,
            pageType,
            resourceId,
            referrer: document.referrer || undefined,
            device: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
            ...utmParams,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          pageViewIdRef.current = data.pageViewId
        }
      } catch {
        // Silently fail - analytics should not break the app
      }
    }

    trackPageView()

    // Send duration on page unload
    const handleUnload = () => {
      sendDuration()
    }

    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [pathname, searchParams, enabled, hasConsent, sendDuration])

  // No UI - this is a tracking-only component
  return null
}
