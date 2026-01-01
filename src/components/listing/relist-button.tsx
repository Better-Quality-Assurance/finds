'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { RefreshCw, Lightbulb, Loader2, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Improvement {
  id: string
  suggestedStartingPrice: number | null
  suggestedReserve: number | null
  avgMarketPrice: number | null
  pricingReasoning: string | null
  topPriorities: string[]
  reason: string
  localSalesCount: number
  globalSalesCount: number
}

interface RelistButtonProps {
  listingId: string
  listingTitle: string
  currentStartingPrice: number
  currentReserve: number | null
  currency: string
  improvement: Improvement | null
}

export function RelistButton({
  listingId,
  listingTitle,
  currentStartingPrice,
  currentReserve,
  currency,
  improvement,
}: RelistButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [applyImprovements, setApplyImprovements] = useState(true)

  const handleRelist = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/listings/${listingId}/relist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyImprovements }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to relist')
      }

      // Redirect to edit the new listing
      router.push(data.editUrl || `/sell?edit=${data.newListingId}`)
    } catch (error) {
      console.error('Relist error:', error)
      alert(error instanceof Error ? error.message : 'Failed to relist listing')
    } finally {
      setLoading(false)
    }
  }

  const hasImprovements = improvement && improvement.topPriorities.length > 0
  const hasPriceSuggestion = improvement?.suggestedStartingPrice != null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <RefreshCw className="mr-1 h-4 w-4" />
          Relist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Relist Your Vehicle</DialogTitle>
          <DialogDescription>
            Create a new listing based on &ldquo;{listingTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasImprovements ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-primary">AI Suggestions Available</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on {improvement.localSalesCount + improvement.globalSalesCount} similar vehicles sold recently
                    </p>
                  </div>

                  {/* Top priorities */}
                  <ul className="space-y-1.5">
                    {improvement.topPriorities.map((priority, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{priority}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Price suggestion */}
                  {hasPriceSuggestion && (
                    <div className="pt-2 border-t border-primary/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current starting price:</span>
                        <span>{formatCurrency(currentStartingPrice, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-medium text-primary mt-1">
                        <span>Suggested starting price:</span>
                        <span>{formatCurrency(improvement.suggestedStartingPrice!, currency)}</span>
                      </div>
                      {improvement.avgMarketPrice && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                          <span>Market average:</span>
                          <span>{formatCurrency(improvement.avgMarketPrice, currency)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing reasoning */}
                  {improvement.pricingReasoning && (
                    <p className="text-xs text-muted-foreground italic">
                      {improvement.pricingReasoning}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="apply-improvements"
                  checked={applyImprovements}
                  onChange={(e) => setApplyImprovements(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="apply-improvements" className="text-sm">
                  Apply suggested pricing to new listing
                </label>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                This will create a new draft listing with all your original details and photos.
                You can review and edit before submitting for approval.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <strong>Note:</strong> The new listing will be created as a draft. You&apos;ll be
            able to make changes before submitting it for review.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRelist} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Create New Listing
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
