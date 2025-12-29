'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Loader2,
  XCircle,
  TrendingUp,
  Clock,
  AlertTriangle,
  Trophy,
  Zap,
  Shield,
} from 'lucide-react'

type Bid = {
  id: string
  amount: string
  createdAt: string
  isValid: boolean
  isWinning: boolean
  triggeredExtension: boolean
  invalidatedReason: string | null
  bidder: {
    id: string
    name: string | null
    email: string
  }
}

type FraudAlert = {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  createdAt: string
  relatedBidId: string | null
}

type BidHistoryDialogProps = {
  auctionId: string | null
  auctionTitle?: string
  currency?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onBidInvalidated?: () => void
}

export function BidHistoryDialog({
  auctionId,
  auctionTitle = 'Auction',
  currency = 'USD',
  open,
  onOpenChange,
  onBidInvalidated,
}: BidHistoryDialogProps) {
  const [bids, setBids] = useState<Bid[]>([])
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [invalidateDialog, setInvalidateDialog] = useState<{
    bid: Bid | null
    reason: string
  }>({ bid: null, reason: '' })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (open && auctionId) {
      fetchBidHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, auctionId])

  const fetchBidHistory = async () => {
    if (!auctionId) {return}

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/auctions/${auctionId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch bid history')
      }

      const data = await response.json()
      setBids(data.auction.bids || [])
      setFraudAlerts(data.fraudAlerts || [])
    } catch (error) {
      toast.error('Failed to load bid history')
      console.error('Bid history fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvalidateBid = async () => {
    if (!invalidateDialog.bid || !auctionId) {return}

    if (invalidateDialog.reason.trim().length < 10) {
      toast.error('Invalidation reason must be at least 10 characters')
      return
    }

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/auctions/${auctionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invalidate_bid',
          bidId: invalidateDialog.bid.id,
          reason: invalidateDialog.reason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invalidate bid')
      }

      toast.success('Bid invalidated successfully')
      setInvalidateDialog({ bid: null, reason: '' })

      // Refresh bid list
      await fetchBidHistory()

      // Notify parent component
      onBidInvalidated?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invalidate bid')
    } finally {
      setProcessing(false)
    }
  }

  const getBidVelocity = (index: number): number | null => {
    if (index >= bids.length - 1) {return null}

    const currentBid = new Date(bids[index].createdAt)
    const previousBid = new Date(bids[index + 1].createdAt)
    const diffMs = currentBid.getTime() - previousBid.getTime()

    return Math.floor(diffMs / 1000) // seconds
  }

  const formatVelocity = (seconds: number | null): string => {
    if (seconds === null) {return '-'}
    if (seconds < 60) {return `${seconds}s`}
    if (seconds < 3600) {return `${Math.floor(seconds / 60)}m`}
    return `${Math.floor(seconds / 3600)}h`
  }

  const getBidFraudAlerts = (bidId: string): FraudAlert[] => {
    return fraudAlerts.filter(alert => alert.relatedBidId === bidId)
  }

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'bg-destructive text-destructive-foreground'
      case 'HIGH': return 'bg-warning text-warning-foreground'
      case 'MEDIUM': return 'bg-warning text-warning-foreground'
      case 'LOW': return 'bg-primary text-primary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bid History</DialogTitle>
            <DialogDescription>{auctionTitle}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No bids yet</p>
              <p className="text-muted-foreground">This auction hasn&apos;t received any bids</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Summary Stats */}
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Total Bids</p>
                  <p className="text-2xl font-bold">{bids.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Valid Bids</p>
                  <p className="text-2xl font-bold text-success">
                    {bids.filter(b => b.isValid).length}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Invalidated</p>
                  <p className="text-2xl font-bold text-destructive">
                    {bids.filter(b => !b.isValid).length}
                  </p>
                </div>
              </div>

              {/* Bid Table */}
              <div className="rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Bidder</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Velocity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bids.map((bid, index) => {
                        const velocity = getBidVelocity(index)
                        const alerts = getBidFraudAlerts(bid.id)
                        const isSuspicious = alerts.length > 0
                        const isFastBid = velocity !== null && velocity < 30

                        return (
                          <tr
                            key={bid.id}
                            className={cn(
                              'hover:bg-muted/50',
                              !bid.isValid && 'bg-destructive/10',
                              isSuspicious && 'bg-warning/10'
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {new Date(bid.createdAt).toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {bid.bidder.name || 'Anonymous'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {bid.bidder.email}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div
                                className={cn(
                                  'font-medium',
                                  !bid.isValid && 'line-through text-muted-foreground'
                                )}
                              >
                                {formatCurrency(Number(bid.amount), currency)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {isFastBid && (
                                  <Zap className="h-3 w-3 text-warning" aria-label="Fast bid" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {formatVelocity(velocity)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1">
                                {bid.isWinning && (
                                  <Badge className="bg-success text-success-foreground">
                                    <Trophy className="mr-1 h-3 w-3" />
                                    Winning
                                  </Badge>
                                )}
                                {bid.triggeredExtension && (
                                  <Badge variant="outline" className="text-xs">
                                    Extended
                                  </Badge>
                                )}
                                {!bid.isValid && (
                                  <Badge className="bg-destructive text-destructive-foreground">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Invalid
                                  </Badge>
                                )}
                                {alerts.map((alert) => (
                                  <Badge
                                    key={alert.id}
                                    className={cn('text-xs', getSeverityColor(alert.severity))}
                                    title={alert.description}
                                  >
                                    <AlertTriangle className="mr-1 h-3 w-3" />
                                    {alert.type}
                                  </Badge>
                                ))}
                              </div>
                              {!bid.isValid && bid.invalidatedReason && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Reason: {bid.invalidatedReason}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {bid.isValid ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive/90"
                                  onClick={() =>
                                    setInvalidateDialog({ bid, reason: '' })
                                  }
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Invalidate
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="mr-1 h-3 w-3" />
                                  Protected
                                </Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fraud Alerts Summary */}
              {fraudAlerts.length > 0 && (
                <div className="mt-4 rounded-lg border border-warning bg-warning/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <h3 className="font-semibold text-warning">
                      Fraud Alerts ({fraudAlerts.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {fraudAlerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="text-sm">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="ml-2 text-warning">
                          {alert.type}: {alert.description}
                        </span>
                      </div>
                    ))}
                    {fraudAlerts.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        And {fraudAlerts.length - 5} more alerts...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invalidate Bid Confirmation Dialog */}
      <AlertDialog
        open={!!invalidateDialog.bid}
        onOpenChange={(open) => !open && setInvalidateDialog({ bid: null, reason: '' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalidate Bid</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to invalidate a bid of{' '}
              {invalidateDialog.bid &&
                formatCurrency(Number(invalidateDialog.bid.amount), currency)}{' '}
              by {invalidateDialog.bid?.bidder.email}.
              {invalidateDialog.bid?.isWinning && (
                <span className="mt-2 block font-semibold text-destructive">
                  Warning: This is the current winning bid. The next highest valid bid
                  will become the winner.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="invalidate-reason">
                Reason for Invalidation *
              </Label>
              <Textarea
                id="invalidate-reason"
                value={invalidateDialog.reason}
                onChange={(e) =>
                  setInvalidateDialog((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Enter a detailed reason for invalidating this bid (minimum 10 characters)..."
                className="mt-1"
                rows={3}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {invalidateDialog.reason.length}/10 characters minimum
              </p>
            </div>

            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mb-1 inline h-4 w-4" />
              <span className="ml-1 font-semibold">Important:</span> This action
              cannot be undone. The bidder will be notified and an audit log entry
              will be created.
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInvalidateBid}
              disabled={processing || invalidateDialog.reason.trim().length < 10}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invalidate Bid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
