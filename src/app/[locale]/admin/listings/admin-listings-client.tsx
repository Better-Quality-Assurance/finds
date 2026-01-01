'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import {
  Car,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  User,
  MapPin,
  Camera,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminListing, ListingStatusFilter } from '@/types'

type AdminListingsClientProps = {
  initialListings: AdminListing[]
  statusCounts: Record<string, number>
  userRole: string
}

const STATUS_TABS: { value: ListingStatusFilter; label: string; color: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Pending Review', color: 'bg-warning' },
  { value: 'CHANGES_REQUESTED', label: 'Changes Requested', color: 'bg-warning' },
  { value: 'APPROVED', label: 'Approved', color: 'bg-success' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-destructive' },
  { value: 'ALL', label: 'All', color: 'bg-muted-foreground' },
]

export function AdminListingsClient({
  initialListings,
  statusCounts,
  userRole,
}: AdminListingsClientProps) {
  const [listings, setListings] = useState<AdminListing[]>(initialListings)
  const [activeStatus, setActiveStatus] = useState<ListingStatusFilter>('PENDING_REVIEW')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request-changes' | null>(null)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchListings = async (status: ListingStatusFilter) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/listings?status=${status}&limit=50`
      const response = await fetch(url)
      if (!response.ok) {throw new Error('Failed to fetch listings')}
      const data = await response.json()
      setListings(data.listings)
    } catch (error) {
      toast.error('Failed to load listings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (status: ListingStatusFilter) => {
    setActiveStatus(status)
    fetchListings(status)
  }

  const handleAction = async () => {
    if (!selectedListing || !actionType) {return}

    if ((actionType === 'reject' || actionType === 'request-changes') && reason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters)')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/listings/${selectedListing.id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Action failed')
      }

      toast.success(
        actionType === 'approve'
          ? 'Listing approved'
          : actionType === 'reject'
            ? 'Listing rejected'
            : 'Changes requested'
      )

      // Remove from current list
      setListings((prev) => prev.filter((l) => l.id !== selectedListing.id))
      setSelectedListing(null)
      setActionType(null)
      setReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openActionDialog = (listing: AdminListing, action: 'approve' | 'reject' | 'request-changes') => {
    setSelectedListing(listing)
    setActionType(action)
    setReason('')
  }

  const canApprove = ['ADMIN', 'MODERATOR', 'REVIEWER'].includes(userRole)
  const canReject = ['ADMIN', 'MODERATOR'].includes(userRole)

  return (
    <>
      {/* Status tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeStatus === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange(tab.value)}
            className="relative"
          >
            {tab.label}
            {statusCounts[tab.value] !== undefined && statusCounts[tab.value] > 0 && (
              <span
                className={cn(
                  'ml-2 rounded-full px-2 py-0.5 text-xs text-white',
                  tab.color
                )}
              >
                {statusCounts[tab.value]}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Car className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No listings</h2>
            <p className="mt-2 text-muted-foreground">
              No listings found with status: {activeStatus.replace('_', ' ').toLowerCase()}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Photos */}
                  <div className="flex-shrink-0 lg:w-80">
                    {listing.media.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 p-1">
                        {listing.media.slice(0, 4).map((photo, idx) => (
                          <div
                            key={photo.id}
                            className={cn(
                              'relative aspect-square w-full overflow-hidden',
                              idx === 0 && 'rounded-tl-lg',
                              idx === 1 && 'rounded-tr-lg lg:rounded-tr-none',
                              idx === 2 && 'rounded-bl-lg lg:rounded-bl-none',
                              idx === 3 && 'rounded-br-lg lg:rounded-br-none'
                            )}
                          >
                            <Image
                              src={photo.publicUrl}
                              alt={`${listing.make} ${listing.model} - Photo ${idx + 1}`}
                              fill
                              sizes="(max-width: 1024px) 50vw, 160px"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-muted">
                        <Camera className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="bg-muted px-3 py-2 text-center text-sm">
                      <Camera className="mr-1 inline h-4 w-4" />
                      {listing._count.media} photos
                      {listing.media.some((m) => m.licensePlateDetected) && (
                        <Badge variant="destructive" className="ml-2 gap-1 text-xs">
                          <ShieldAlert className="h-3 w-3" />
                          Plate
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {listing.year} {listing.make} {listing.model}
                        </p>
                      </div>
                      <Badge
                        variant={listing.isRunning ? 'success' : 'warning'}
                      >
                        {listing.isRunning ? 'Running' : 'Not Running'}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {listing.seller.name || listing.seller.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {listing.locationCity}, {listing.locationCountry}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Starting:</span>{' '}
                        <span className="font-medium">
                          {formatCurrency(Number(listing.startingPrice), listing.currency)}
                        </span>
                      </div>
                      {listing.reservePrice != null && (
                        <div>
                          <span className="text-muted-foreground">Reserve:</span>{' '}
                          <span className="font-medium">
                            {formatCurrency(Number(listing.reservePrice), listing.currency)}
                          </span>
                        </div>
                      )}
                      {listing.mileage && (
                        <div>
                          <span className="text-muted-foreground">Mileage:</span>{' '}
                          <span className="font-medium">
                            {listing.mileage.toLocaleString()} km
                          </span>
                        </div>
                      )}
                      {listing.conditionRating && (
                        <div>
                          <span className="text-muted-foreground">Condition:</span>{' '}
                          <span className="font-medium">{listing.conditionRating}/10</span>
                        </div>
                      )}
                    </div>

                    {listing.knownIssues && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Known Issues:</p>
                        <p className="mt-1 text-sm">{listing.knownIssues}</p>
                      </div>
                    )}

                    <div className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                      {listing.description}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/admin/listings/${listing.id}`}>
                          <Eye className="mr-1 h-4 w-4" />
                          View Full Details
                        </a>
                      </Button>

                      {canApprove && listing.status === 'PENDING_REVIEW' && (
                        <Button
                          size="sm"
                          onClick={() => openActionDialog(listing, 'approve')}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                      )}

                      {canApprove && listing.status === 'PENDING_REVIEW' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openActionDialog(listing, 'request-changes')}
                        >
                          <AlertCircle className="mr-1 h-4 w-4" />
                          Request Changes
                        </Button>
                      )}

                      {canReject && listing.status === 'PENDING_REVIEW' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openActionDialog(listing, 'reject')}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={!!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null)
            setSelectedListing(null)
            setReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? 'Approve Listing'
                : actionType === 'reject'
                  ? 'Reject Listing'
                  : 'Request Changes'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'This listing will be approved and ready for auction scheduling.'
                : actionType === 'reject'
                  ? 'Please provide a reason for rejection. This action cannot be undone.'
                  : 'Please specify what changes are needed. The seller will be notified.'}
            </DialogDescription>
          </DialogHeader>

          {selectedListing && (
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">{selectedListing.title}</p>
              <p className="text-sm text-muted-foreground">
                by {selectedListing.seller.name || selectedListing.seller.email}
              </p>
            </div>
          )}

          {(actionType === 'reject' || actionType === 'request-changes') && (
            <Textarea
              placeholder={
                actionType === 'reject'
                  ? 'Reason for rejection...'
                  : 'What changes are needed...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionType(null)
                setSelectedListing(null)
                setReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === 'approve'
                ? 'Approve'
                : actionType === 'reject'
                  ? 'Reject'
                  : 'Request Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
