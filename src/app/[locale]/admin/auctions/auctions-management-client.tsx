'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Search,
  MoreHorizontal,
  Gavel,
  Clock,
  XCircle,
  Timer,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { BidHistoryDialog } from '@/components/admin/bid-history-dialog'
import type { AdminAuctionData, DashboardStats } from '@/types'

export function AuctionsManagementClient() {
  const [auctions, setAuctions] = useState<AdminAuctionData[]>([])
  const [stats, setStats] = useState<DashboardStats>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [actionDialog, setActionDialog] = useState<{
    type: 'cancel' | 'end' | 'extend' | 'view' | null
    auction: AdminAuctionData | null
  }>({ type: null, auction: null })
  const [actionReason, setActionReason] = useState('')
  const [extensionMinutes, setExtensionMinutes] = useState('60')
  const [processing, setProcessing] = useState(false)

  const [bidHistoryDialog, setBidHistoryDialog] = useState<{
    open: boolean
    auctionId: string | null
    auctionTitle: string
    currency: string
  }>({ open: false, auctionId: null, auctionTitle: '', currency: 'USD' })

  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) {params.set('search', search)}
      if (statusFilter) {params.set('status', statusFilter)}
      params.set('page', page.toString())

      const response = await fetch(`/api/admin/auctions?${params}`)
      if (!response.ok) {throw new Error('Failed to fetch auctions')}

      const data = await response.json()
      setAuctions(data.auctions)
      setStats(data.stats)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      toast.error('Failed to load auctions')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  const handleAction = async () => {
    if (!actionDialog.auction || !actionDialog.type || actionDialog.type === 'view') {return}

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/auctions/${actionDialog.auction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionDialog.type,
          reason: actionReason,
          extensionMinutes: actionDialog.type === 'extend' ? parseInt(extensionMinutes) : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Action failed')
      }

      toast.success(`Auction ${actionDialog.type} successful`)
      setActionDialog({ type: null, auction: null })
      setActionReason('')
      fetchAuctions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { class: string; label: string }> = {
      SCHEDULED: { class: 'bg-primary', label: 'Scheduled' },
      ACTIVE: { class: 'bg-success', label: 'Active' },
      EXTENDED: { class: 'bg-warning', label: 'Extended' },
      ENDED: { class: 'bg-muted-foreground', label: 'Ended' },
      SOLD: { class: 'bg-success', label: 'Sold' },
      NO_SALE: { class: 'bg-warning', label: 'No Sale' },
      CANCELLED: { class: 'bg-destructive', label: 'Cancelled' },
    }
    const v = variants[status] || { class: 'bg-muted-foreground', label: status }
    return <Badge className={`${v.class} text-white`}>{v.label}</Badge>
  }

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) {return 'Ended'}

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Gavel className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.ACTIVE || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.SCHEDULED || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.SOLD || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.CANCELLED || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, make, model..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter || '__all__'} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="EXTENDED">Extended</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
            <SelectItem value="NO_SALE">No Sale</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchAuctions} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Auctions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : auctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Gavel className="mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No auctions found</p>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Auction</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Current Bid</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Activity</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auctions.map((auction) => (
                    <tr key={auction.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{auction.listing.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {auction.listing.year} {auction.listing.make} {auction.listing.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Seller: {auction.listing.seller.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {getStatusBadge(auction.status)}
                          {auction.reserveMet && (
                            <Badge variant="outline" className="block w-fit text-xs">
                              Reserve Met
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {auction.currentBid
                            ? formatCurrency(Number(auction.currentBid), auction.currency)
                            : 'No bids'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {auction.bidCount} bids
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span className={cn(
                            'text-sm',
                            auction.status === 'ACTIVE' && 'font-medium'
                          )}>
                            {getTimeRemaining(auction.currentEndTime)}
                          </span>
                        </div>
                        {auction.extensionCount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Extended {auction.extensionCount}x
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>{auction._count.bids} bids</p>
                          <p className="text-muted-foreground">
                            {auction._count.watchlist} watching
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setActionDialog({ type: 'view', auction })}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {auction.bidCount > 0 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setBidHistoryDialog({
                                    open: true,
                                    auctionId: auction.id,
                                    auctionTitle: auction.listing.title,
                                    currency: auction.currency,
                                  })
                                }
                              >
                                <List className="mr-2 h-4 w-4" />
                                View Bids ({auction.bidCount})
                              </DropdownMenuItem>
                            )}
                            {auction.status === 'ACTIVE' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setActionDialog({ type: 'extend', auction })}
                                >
                                  <Timer className="mr-2 h-4 w-4" />
                                  Extend Time
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setActionDialog({ type: 'end', auction })}
                                >
                                  <Gavel className="mr-2 h-4 w-4" />
                                  End Now
                                </DropdownMenuItem>
                              </>
                            )}
                            {['SCHEDULED', 'ACTIVE'].includes(auction.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setActionDialog({ type: 'cancel', auction })}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Auction
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={!!actionDialog.type && actionDialog.type !== 'view'}
        onOpenChange={() => {
          setActionDialog({ type: null, auction: null })
          setActionReason('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'cancel' && 'Cancel Auction'}
              {actionDialog.type === 'end' && 'End Auction Now'}
              {actionDialog.type === 'extend' && 'Extend Auction'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.auction?.listing.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionDialog.type === 'extend' && (
              <div>
                <label className="text-sm font-medium">Extension Duration</label>
                <Select value={extensionMinutes} onValueChange={setExtensionMinutes}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter reason for this action..."
                className="mt-1"
                rows={3}
              />
            </div>

            {actionDialog.type === 'cancel' && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm">
                <AlertTriangle className="mb-1 h-4 w-4" />
                This will cancel the auction and release all deposits.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ type: null, auction: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionDialog.type === 'cancel' ? 'destructive' : 'default'}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={actionDialog.type === 'view'}
        onOpenChange={() => setActionDialog({ type: null, auction: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Auction Details</DialogTitle>
          </DialogHeader>

          {actionDialog.auction && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Title</label>
                  <p className="font-medium">{actionDialog.auction.listing.title}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Vehicle</label>
                  <p className="font-medium">
                    {actionDialog.auction.listing.year} {actionDialog.auction.listing.make}{' '}
                    {actionDialog.auction.listing.model}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <p>{getStatusBadge(actionDialog.auction.status)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Current Bid</label>
                  <p className="font-medium">
                    {actionDialog.auction.currentBid
                      ? formatCurrency(Number(actionDialog.auction.currentBid), actionDialog.auction.currency)
                      : 'No bids'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Seller</label>
                  <p className="font-medium">{actionDialog.auction.listing.seller.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Extensions</label>
                  <p className="font-medium">{actionDialog.auction.extensionCount}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Ends</label>
                  <p className="font-medium">
                    {new Date(actionDialog.auction.currentEndTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Auction ID</label>
                  <p className="font-mono text-xs">{actionDialog.auction.id}</p>
                </div>
              </div>

              {actionDialog.auction.bidCount > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      This auction has {actionDialog.auction.bidCount} bid
                      {actionDialog.auction.bidCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      View complete bid history and manage bids
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBidHistoryDialog({
                        open: true,
                        auctionId: actionDialog.auction!.id,
                        auctionTitle: actionDialog.auction!.listing.title,
                        currency: actionDialog.auction!.currency,
                      })
                      setActionDialog({ type: null, auction: null })
                    }}
                  >
                    <List className="mr-2 h-4 w-4" />
                    View Bids
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setActionDialog({ type: null, auction: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bid History Dialog */}
      <BidHistoryDialog
        auctionId={bidHistoryDialog.auctionId}
        auctionTitle={bidHistoryDialog.auctionTitle}
        currency={bidHistoryDialog.currency}
        open={bidHistoryDialog.open}
        onOpenChange={(open) =>
          setBidHistoryDialog((prev) => ({ ...prev, open }))
        }
        onBidInvalidated={() => {
          fetchAuctions()
        }}
      />
    </>
  )
}
