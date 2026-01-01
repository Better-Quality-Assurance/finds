'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Brain,
  Eye,
  MessageSquare,
  Shield,
  Car,
  Loader2,
  RefreshCw,
  Save,
  RotateCcw,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AISettingsClientProps {
  isAdmin: boolean
}

interface AISettings {
  moderation: {
    commentAutoApproveThreshold: number
    commentAutoRejectThreshold: number
    listingFlagThreshold: number
    suspicionScoreThreshold: number
    bidAnalysisWindowMinutes: number
    defaultModel: string
    visionModel: string
    maxRequestsPerMinute: number
  }
  licensePlate: {
    visionModel: string
    temperature: number
    maxTokens: number
    confidenceThreshold: number
    blurRadius: number
    marginExpansion: number
    maxRetries: number
    retryBaseDelay: number
    defaultConcurrency: number
  }
  stats: {
    listingsAnalyzed: number
    commentsModerated: number
    suspiciousBidPatterns: number
    carReviewsGenerated: number
    avgConfidenceScore: number
  }
  updatedAt: string | null
}

const AI_MODELS = [
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (Fast)' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
]

const VISION_MODELS = [
  { value: 'openai/gpt-4o', label: 'GPT-4o (Recommended)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
]

export function AISettingsClient({ isAdmin }: AISettingsClientProps) {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [originalSettings, setOriginalSettings] = useState<AISettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ai-settings')
      if (!response.ok) {throw new Error('Failed to fetch settings')}

      const data = await response.json()
      setSettings(data)
      setOriginalSettings(data)
      setHasChanges(false)
    } catch (error) {
      toast.error('Failed to load AI settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Track changes
  useEffect(() => {
    if (!settings || !originalSettings) {return}
    const changed = JSON.stringify(settings.moderation) !== JSON.stringify(originalSettings.moderation) ||
                   JSON.stringify(settings.licensePlate) !== JSON.stringify(originalSettings.licensePlate)
    setHasChanges(changed)
  }, [settings, originalSettings])

  const handleSave = async () => {
    if (!settings) {return}

    try {
      setSaving(true)
      const response = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderation: settings.moderation,
          licensePlate: settings.licensePlate,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.errors) {
          error.errors.forEach((e: { field: string; message: string }) => {
            toast.error(`${e.field}: ${e.message}`)
          })
        } else {
          throw new Error(error.error || 'Failed to save')
        }
        return
      }

      const data = await response.json()
      setSettings({ ...settings, ...data.settings })
      setOriginalSettings({ ...settings, ...data.settings })
      setHasChanges(false)
      toast.success('AI settings saved successfully')
    } catch (error) {
      toast.error('Failed to save AI settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings)
      setHasChanges(false)
      toast.info('Changes discarded')
    }
  }

  const updateModeration = <K extends keyof AISettings['moderation']>(
    key: K,
    value: AISettings['moderation'][K]
  ) => {
    if (!settings) {return}
    setSettings({
      ...settings,
      moderation: { ...settings.moderation, [key]: value },
    })
  }

  const updateLicensePlate = <K extends keyof AISettings['licensePlate']>(
    key: K,
    value: AISettings['licensePlate'][K]
  ) => {
    if (!settings) {return}
    setSettings({
      ...settings,
      licensePlate: { ...settings.licensePlate, [key]: value },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load settings</p>
        <Button onClick={fetchSettings} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listings Analyzed</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.stats.listingsAnalyzed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total AI analyses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments Moderated</CardTitle>
            <MessageSquare className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.stats.commentsModerated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Auto-moderated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Bids</CardTitle>
            <Shield className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.stats.suspiciousBidPatterns}</div>
            <p className="text-xs text-muted-foreground">Patterns detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(settings.stats.avgConfidenceScore * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">AI confidence score</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={fetchSettings} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          {settings.updatedAt && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              disabled={!hasChanges || saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Discard
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
          You have read-only access. Contact an admin to make changes.
        </div>
      )}

      {/* AI Models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Models
          </CardTitle>
          <CardDescription>Select which AI models to use for different tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Model (Text Analysis)</Label>
              <Select
                value={settings.moderation.defaultModel}
                onValueChange={(v) => updateModeration('defaultModel', v)}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for listing analysis, comments, bids</p>
            </div>

            <div className="space-y-2">
              <Label>Vision Model (Image Analysis)</Label>
              <Select
                value={settings.moderation.visionModel}
                onValueChange={(v) => updateModeration('visionModel', v)}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISION_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for car photos and license plates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment Moderation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comment Moderation
          </CardTitle>
          <CardDescription>Thresholds for automatic comment approval and rejection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Auto-approve Threshold</Label>
                <span className="text-sm font-medium">
                  {(settings.moderation.commentAutoApproveThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[settings.moderation.commentAutoApproveThreshold]}
                onValueChange={([v]) => updateModeration('commentAutoApproveThreshold', v)}
                min={0.5}
                max={1}
                step={0.01}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Comments with confidence above this are auto-approved
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Auto-reject Threshold (Spam/Toxic)</Label>
                <span className="text-sm font-medium">
                  {(settings.moderation.commentAutoRejectThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[settings.moderation.commentAutoRejectThreshold]}
                onValueChange={([v]) => updateModeration('commentAutoRejectThreshold', v)}
                min={0.5}
                max={1}
                step={0.01}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Comments with spam/toxicity above this are auto-hidden
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listing Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Listing Analysis
          </CardTitle>
          <CardDescription>Thresholds for flagging listings for manual review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Flag for Review Threshold</Label>
              <span className="text-sm font-medium">
                {(settings.moderation.listingFlagThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[settings.moderation.listingFlagThreshold]}
              onValueChange={([v]) => updateModeration('listingFlagThreshold', v)}
              min={0.3}
              max={1}
              step={0.01}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Listings below this confidence are flagged for manual review
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fraud Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fraud Detection
          </CardTitle>
          <CardDescription>Bid pattern analysis and fraud alert settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Suspicion Score Threshold</Label>
              <span className="text-sm font-medium">
                {(settings.moderation.suspicionScoreThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[settings.moderation.suspicionScoreThreshold]}
              onValueChange={([v]) => updateModeration('suspicionScoreThreshold', v)}
              min={0.5}
              max={1}
              step={0.01}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Bid patterns above this score trigger fraud alerts
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Analysis Window (minutes)</Label>
              <Input
                type="number"
                value={settings.moderation.bidAnalysisWindowMinutes}
                onChange={(e) => updateModeration('bidAnalysisWindowMinutes', parseInt(e.target.value) || 60)}
                min={15}
                max={1440}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">Time window for bid pattern analysis</p>
            </div>

            <div className="space-y-2">
              <Label>Max Requests/Minute</Label>
              <Input
                type="number"
                value={settings.moderation.maxRequestsPerMinute}
                onChange={(e) => updateModeration('maxRequestsPerMinute', parseInt(e.target.value) || 50)}
                min={10}
                max={200}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">API rate limit for AI requests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Plate Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            License Plate Detection
          </CardTitle>
          <CardDescription>Settings for automatic license plate blurring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Detection Confidence</Label>
              <span className="text-sm font-medium">
                {(settings.licensePlate.confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[settings.licensePlate.confidenceThreshold]}
              onValueChange={([v]) => updateLicensePlate('confidenceThreshold', v)}
              min={0.3}
              max={1}
              step={0.01}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Minimum confidence to trigger plate blurring
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Blur Radius (pixels)</Label>
              <Input
                type="number"
                value={settings.licensePlate.blurRadius}
                onChange={(e) => updateLicensePlate('blurRadius', parseInt(e.target.value) || 30)}
                min={10}
                max={100}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label>Margin Expansion (%)</Label>
              <Input
                type="number"
                value={settings.licensePlate.marginExpansion}
                onChange={(e) => updateLicensePlate('marginExpansion', parseInt(e.target.value) || 15)}
                min={0}
                max={50}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                value={settings.licensePlate.temperature}
                onChange={(e) => updateLicensePlate('temperature', parseFloat(e.target.value) || 0.1)}
                min={0}
                max={1}
                step={0.1}
                disabled={!isAdmin}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Max Retries</Label>
              <Input
                type="number"
                value={settings.licensePlate.maxRetries}
                onChange={(e) => updateLicensePlate('maxRetries', parseInt(e.target.value) || 3)}
                min={1}
                max={10}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label>Concurrency</Label>
              <Input
                type="number"
                value={settings.licensePlate.defaultConcurrency}
                onChange={(e) => updateLicensePlate('defaultConcurrency', parseInt(e.target.value) || 3)}
                min={1}
                max={10}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
