'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AdminMediaViewer, AdminMediaItem } from '@/components/admin/admin-media-viewer'
import { PriceEstimatePanel } from '@/components/admin/price-estimate-panel'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import {
  Car,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  MapPin,
  Camera,
  FileText,
  Wrench,
  Brain,
  DollarSign,
  ShieldAlert,
  Shield,
} from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'
import type { Prisma, ListingStatus } from '@prisma/client'

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    seller: {
      select: {
        id: true
        name: true
        email: true
        phone: true
        createdAt: true
        _count: { select: { listings: true; bids: true } }
      }
    }
    media: {
      select: {
        id: true
        type: true
        publicUrl: true
        originalUrl: true
        thumbnailUrl: true
        position: true
        isPrimary: true
        category: true
        caption: true
        fileSize: true
        mimeType: true
        width: true
        height: true
        licensePlateDetected: true
        licensePlateBlurred: true
        plateDetectionData: true
        createdAt: true
      }
    }
    aiAnalysis: { select: { id: true; decision: true; confidenceScore: true; approvalReasoning: true; issues: true } }
    aiCarReview: { select: { id: true; overallScore: true; conditionSummary: true } }
    auction: { select: { id: true; status: true } }
  }
}>

type AdminListingDetailClientProps = {
  listing: ListingWithRelations
  userRole: string
}

const STATUS_BADGES: Record<ListingStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'warning' },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  ACTIVE: { label: 'Active', variant: 'success' },
  SOLD: { label: 'Sold', variant: 'default' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'secondary' },
  EXPIRED: { label: 'Expired', variant: 'destructive' },
}

export function AdminListingDetailClient({ listing, userRole }: AdminListingDetailClientProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isRequestingChanges, setIsRequestingChanges] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showChangesDialog, setShowChangesDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [changeRequest, setChangeRequest] = useState('')

  const canReview = ['ADMIN', 'MODERATOR', 'REVIEWER'].includes(userRole)
  const isPending = listing.status === 'PENDING_REVIEW' || listing.status === 'CHANGES_REQUESTED'
  const photos = listing.media.filter(m => m.type === 'PHOTO')
  const statusBadge = STATUS_BADGES[listing.status]
  const licensePlateCount = listing.media.filter((m) => m.licensePlateDetected).length

  // Convert media to AdminMediaItem format
  const adminMedia: AdminMediaItem[] = listing.media.map((item) => ({
    id: item.id,
    publicUrl: item.publicUrl,
    originalUrl: item.originalUrl,
    thumbnailUrl: item.thumbnailUrl,
    type: item.type as 'PHOTO' | 'VIDEO',
    category: item.category,
    caption: item.caption,
    position: item.position,
    isPrimary: item.isPrimary,
    licensePlateDetected: item.licensePlateDetected,
    licensePlateBlurred: item.licensePlateBlurred,
    plateDetectionData: item.plateDetectionData as AdminMediaItem['plateDetectionData'],
  }))

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}/approve`, { method: 'POST' })
      if (!response.ok) {throw new Error('Failed to approve')}
      toast.success('Listing approved successfully')
      window.location.reload()
    } catch {
      toast.error('Failed to approve listing')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) { toast.error('Please provide a rejection reason'); return }
    setIsRejecting(true)
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      })
      if (!response.ok) {throw new Error('Failed to reject')}
      toast.success('Listing rejected')
      setShowRejectDialog(false)
      window.location.reload()
    } catch {
      toast.error('Failed to reject listing')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleRequestChanges = async () => {
    if (!changeRequest.trim()) { toast.error('Please describe the required changes'); return }
    setIsRequestingChanges(true)
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: changeRequest }),
      })
      if (!response.ok) {throw new Error('Failed to request changes')}
      toast.success('Change request sent to seller')
      setShowChangesDialog(false)
      window.location.reload()
    } catch {
      toast.error('Failed to request changes')
    } finally {
      setIsRequestingChanges(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/listings"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <p className="text-muted-foreground">{listing.year} {listing.make} {listing.model}</p>
          </div>
        </div>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
      </div>

      {canReview && isPending && (
        <Card>
          <CardContent className="flex flex-wrap gap-3 p-4">
            <Button onClick={handleApprove} disabled={isApproving} className="gap-2">
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve
            </Button>
            <Button variant="outline" onClick={() => setShowChangesDialog(true)} className="gap-2">
              <AlertCircle className="h-4 w-4" />Request Changes
            </Button>
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)} className="gap-2">
              <XCircle className="h-4 w-4" />Reject
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Media ({listing.media.length})
                </CardTitle>
                {licensePlateCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    {licensePlateCount} plate{licensePlateCount > 1 ? 's' : ''} detected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {licensePlateCount > 0 && (
                <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-orange-600" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-orange-900">
                        License Plate Privacy Protection Active
                      </p>
                      <p className="mt-1 text-orange-800">
                        {licensePlateCount} image{licensePlateCount > 1 ? 's have' : ' has'}{' '}
                        detected license plates. Public versions are automatically blurred. As an
                        admin, you can toggle to view original unblurred images using the eye icon
                        on each affected image.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <AdminMediaViewer media={adminMedia} listingTitle={listing.title} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Description</CardTitle></CardHeader>
            <CardContent><Markdown content={listing.description} /></CardContent>
          </Card>

          {(listing.conditionNotes || listing.knownIssues) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />Condition Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {listing.conditionNotes && <div><h4 className="text-sm font-medium text-muted-foreground mb-2">Condition Notes</h4><Markdown content={listing.conditionNotes} /></div>}
                {listing.knownIssues && <div><h4 className="text-sm font-medium text-muted-foreground mb-2">Known Issues</h4><Markdown content={listing.knownIssues} /></div>}
              </CardContent>
            </Card>
          )}

          {listing.aiAnalysis && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />AI Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant={listing.aiAnalysis.decision === 'APPROVE' ? 'success' : listing.aiAnalysis.decision === 'REJECT' ? 'destructive' : 'warning'}>{listing.aiAnalysis.decision}</Badge>
                  <span className="text-sm text-muted-foreground">Confidence: {Math.round((listing.aiAnalysis.confidenceScore || 0) * 100)}%</span>
                </div>
                {listing.aiAnalysis.approvalReasoning && <p className="text-sm">{listing.aiAnalysis.approvalReasoning}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" />Vehicle Info</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Make</dt><dd>{listing.make}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Model</dt><dd>{listing.model}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Year</dt><dd>{listing.year}</dd></div>
                {listing.mileage && <div className="flex justify-between"><dt className="text-muted-foreground">Mileage</dt><dd>{listing.mileage.toLocaleString()} {listing.mileageUnit}</dd></div>}
                {listing.vin && <div className="flex justify-between"><dt className="text-muted-foreground">VIN</dt><dd className="font-mono text-xs">{listing.vin}</dd></div>}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Pricing</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Starting Price</dt><dd className="font-medium">{formatCurrency(Number(listing.startingPrice), listing.currency)}</dd></div>
                {listing.reservePrice && <div className="flex justify-between"><dt className="text-muted-foreground">Reserve Price</dt><dd className="font-medium">{formatCurrency(Number(listing.reservePrice), listing.currency)}</dd></div>}
              </dl>
            </CardContent>
          </Card>

          <PriceEstimatePanel
            listingId={listing.id}
            currentEstimateLow={listing.estimateLow}
            currentEstimateHigh={listing.estimateHigh}
            currency={listing.currency}
          />

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Location</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{listing.locationCity}, {listing.locationCountry}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Seller</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{listing.seller.name || 'N/A'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Listings</dt><dd>{listing.seller._count.listings}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Listing</DialogTitle><DialogDescription>Please provide a reason for rejecting this listing.</DialogDescription></DialogHeader>
          <Textarea placeholder="Rejection reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>{isRejecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Changes</DialogTitle><DialogDescription>Describe what changes the seller needs to make.</DialogDescription></DialogHeader>
          <Textarea placeholder="Required changes..." value={changeRequest} onChange={(e) => setChangeRequest(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangesDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestChanges} disabled={isRequestingChanges}>{isRequestingChanges && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Send Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
