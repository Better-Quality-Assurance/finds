'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Link } from '@/i18n/routing'
import { X } from 'lucide-react'

type ConsentSettings = {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

const CONSENT_COOKIE_NAME = 'cookie-consent'
const CONSENT_VERSION = '1'

function getStoredConsent(): ConsentSettings | null {
  if (typeof window === 'undefined') {return null}

  try {
    const stored = localStorage.getItem(CONSENT_COOKIE_NAME)
    if (!stored) {return null}

    const parsed = JSON.parse(stored)
    if (parsed.version !== CONSENT_VERSION) {return null}

    return parsed.settings
  } catch {
    return null
  }
}

function setStoredConsent(settings: ConsentSettings) {
  if (typeof window === 'undefined') {return}

  localStorage.setItem(
    CONSENT_COOKIE_NAME,
    JSON.stringify({
      version: CONSENT_VERSION,
      settings,
      timestamp: new Date().toISOString(),
    })
  )

  // Also set a cookie for server-side access
  document.cookie = `${CONSENT_COOKIE_NAME}=${JSON.stringify(settings)}; path=/; max-age=31536000; SameSite=Lax`
}

export function CookieConsent() {
  const t = useTranslations('cookie')
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ConsentSettings>({
    essential: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored) {
      setSettings(stored)
      setShowBanner(false)
    } else {
      setShowBanner(true)
    }
  }, [])

  const saveConsentToDatabase = async (settings: ConsentSettings) => {
    try {
      const consents = [
        { type: 'ESSENTIAL', granted: settings.essential },
        { type: 'ANALYTICS', granted: settings.analytics },
        { type: 'MARKETING', granted: settings.marketing },
      ]

      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consents }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to save consent to database:', error)
        // Continue even if database save fails - don't block user experience
      }
    } catch (error) {
      console.error('Error saving consent to database:', error)
      // Continue even if database save fails - don't block user experience
    }
  }

  const handleAcceptAll = async () => {
    const allAccepted: ConsentSettings = {
      essential: true,
      analytics: true,
      marketing: true,
    }
    setSettings(allAccepted)
    setStoredConsent(allAccepted)
    setShowBanner(false)
    setShowSettings(false)

    // Save to database for GDPR compliance (non-blocking)
    saveConsentToDatabase(allAccepted)
  }

  const handleAcceptEssential = async () => {
    const essentialOnly: ConsentSettings = {
      essential: true,
      analytics: false,
      marketing: false,
    }
    setSettings(essentialOnly)
    setStoredConsent(essentialOnly)
    setShowBanner(false)
    setShowSettings(false)

    // Save to database for GDPR compliance (non-blocking)
    saveConsentToDatabase(essentialOnly)
  }

  const handleSavePreferences = async () => {
    setStoredConsent(settings)
    setShowBanner(false)
    setShowSettings(false)

    // Save to database for GDPR compliance (non-blocking)
    saveConsentToDatabase(settings)
  }

  if (!showBanner) {return null}

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <Card className="mx-auto max-w-2xl shadow-lg">
        <CardHeader className="relative pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={() => setShowBanner(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {showSettings ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="essential" className="font-medium">
                    {t('essential')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('essentialDesc')}
                  </p>
                </div>
                <Switch id="essential" checked disabled />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics" className="font-medium">
                    {t('analytics')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('analyticsDesc')}
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={settings.analytics}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, analytics: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing" className="font-medium">
                    {t('marketing')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('marketingDesc')}
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={settings.marketing}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, marketing: checked }))
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSavePreferences} className="flex-1">
                  {t('savePreferences')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleAcceptAll} className="flex-1">
                  {t('acceptAll')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAcceptEssential}
                  className="flex-1"
                >
                  {t('acceptEssential')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowSettings(true)}
                  className="flex-1"
                >
                  Customize
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Learn more in our{' '}
                <Link href="/legal/cookies" className="underline">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
