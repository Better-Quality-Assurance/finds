'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Edit2, Save, X, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PriceFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  description: string
  percentage?: number
}

interface PriceEstimatePanelProps {
  listingId: string
  currentEstimateLow: number | null
  currentEstimateHigh: number | null
  currency?: string
  onEstimateUpdated?: (low: number, high: number) => void
}

export function PriceEstimatePanel({
  listingId,
  currentEstimateLow,
  currentEstimateHigh,
  currency = 'EUR',
  onEstimateUpdated,
}: PriceEstimatePanelProps) {
  const t = useTranslations('admin')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const [estimateLow, setEstimateLow] = useState(currentEstimateLow || 0)
  const [estimateHigh, setEstimateHigh] = useState(currentEstimateHigh || 0)

  const [aiResult, setAiResult] = useState<{
    confidence: number
    reasoning: string
    factors: PriceFactor[]
    marketInsights: string
  } | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleGenerateEstimate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/admin/listings/${listingId}/estimate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate estimate')
      }

      const data = await response.json()

      setEstimateLow(data.estimateLow)
      setEstimateHigh(data.estimateHigh)
      setAiResult({
        confidence: data.confidence,
        reasoning: data.reasoning,
        factors: data.factors || [],
        marketInsights: data.marketInsights,
      })

      onEstimateUpdated?.(data.estimateLow, data.estimateHigh)
      toast.success('Price estimate generated')
    } catch {
      toast.error('Failed to generate estimate')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveManualEstimate = async () => {
    if (estimateLow > estimateHigh) {
      toast.error('Low estimate cannot exceed high estimate')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/listings/${listingId}/estimate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateLow, estimateHigh }),
      })

      if (!response.ok) {
        throw new Error('Failed to save estimate')
      }

      onEstimateUpdated?.(estimateLow, estimateHigh)
      setIsEditing(false)
      toast.success('Estimate saved')
    } catch {
      toast.error('Failed to save estimate')
    } finally {
      setIsSaving(false)
    }
  }

  const getImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) {return 'bg-green-100 text-green-800'}
    if (confidence >= 0.6) {return 'bg-yellow-100 text-yellow-800'}
    return 'bg-red-100 text-red-800'
  }

  const hasEstimate = estimateLow > 0 && estimateHigh > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Price Estimate
            </CardTitle>
            <CardDescription>AI-powered market valuation</CardDescription>
          </div>
          {hasEstimate && aiResult && (
            <Badge className={cn('text-xs', getConfidenceColor(aiResult.confidence))}>
              {Math.round(aiResult.confidence * 100)}% confidence
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current/Edit Estimate */}
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="estimateLow">Low ({currency})</Label>
                <Input
                  id="estimateLow"
                  type="number"
                  value={estimateLow}
                  onChange={(e) => setEstimateLow(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="estimateHigh">High ({currency})</Label>
                <Input
                  id="estimateHigh"
                  type="number"
                  value={estimateHigh}
                  onChange={(e) => setEstimateHigh(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveManualEstimate}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEstimateLow(currentEstimateLow || 0)
                  setEstimateHigh(currentEstimateHigh || 0)
                  setIsEditing(false)
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : hasEstimate ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {formatPrice(estimateLow)} - {formatPrice(estimateHigh)}
              </p>
              <p className="text-sm text-muted-foreground">Estimated market value</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No estimate generated yet</p>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerateEstimate}
          disabled={isGenerating}
          className="w-full"
          variant={hasEstimate ? 'outline' : 'default'}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating
            ? 'Analyzing market data...'
            : hasEstimate
              ? 'Regenerate Estimate'
              : 'Generate AI Estimate'}
        </Button>

        {/* AI Analysis Details */}
        {aiResult && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                View AI Analysis
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    showDetails && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Reasoning */}
              <div>
                <Label className="text-xs text-muted-foreground">Reasoning</Label>
                <p className="text-sm">{aiResult.reasoning}</p>
              </div>

              {/* Factors */}
              {aiResult.factors.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Price Factors</Label>
                  <div className="space-y-2 mt-1">
                    {aiResult.factors.map((factor, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm bg-muted/50 rounded p-2"
                      >
                        {getImpactIcon(factor.impact)}
                        <div className="flex-1">
                          <span className="font-medium">{factor.factor}</span>
                          {factor.percentage && (
                            <span
                              className={cn(
                                'ml-2 text-xs',
                                factor.percentage > 0
                                  ? 'text-green-600'
                                  : factor.percentage < 0
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                              )}
                            >
                              {factor.percentage > 0 ? '+' : ''}
                              {factor.percentage}%
                            </span>
                          )}
                          <p className="text-muted-foreground">{factor.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Market Insights */}
              <div>
                <Label className="text-xs text-muted-foreground">Market Insights</Label>
                <p className="text-sm">{aiResult.marketInsights}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
