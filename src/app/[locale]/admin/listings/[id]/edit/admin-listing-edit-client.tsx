'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Loader2,
  Car,
  FileText,
  MapPin,
  DollarSign,
  Camera,
  Trash2,
  Star,
  Plus,
  GripVertical,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react'
import {
  CATEGORIES,
  COMMON_MAKES,
  CONDITION_RATINGS,
  EU_COUNTRIES,
  CURRENCIES,
} from '@/constants/listing-form'
import type { Prisma, ListingStatus } from '@prisma/client'

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    seller: { select: { id: true; name: true; email: true } }
    media: true
    auction: { select: { id: true; status: true; bidCount: true } }
  }
}>

// Statuses that require admin override
const RESTRICTED_STATUSES: ListingStatus[] = ['APPROVED', 'ACTIVE', 'SOLD', 'WITHDRAWN', 'EXPIRED']

type AdminListingEditClientProps = {
  listing: ListingWithRelations
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

export function AdminListingEditClient({ listing }: AdminListingEditClientProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [media, setMedia] = useState(listing.media)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [isAddingImage, setIsAddingImage] = useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)

  // Determine if this listing requires override
  const isRestrictedStatus = RESTRICTED_STATUSES.includes(listing.status)
  const hasActiveBids = listing.auction?.status === 'ACTIVE' && (listing.auction?.bidCount ?? 0) > 0
  const requiresOverride = isRestrictedStatus || hasActiveBids

  // Form state
  const [formData, setFormData] = useState({
    title: listing.title,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    mileage: listing.mileage ?? '',
    vin: listing.vin ?? '',
    category: listing.category,
    description: listing.description,
    conditionNotes: listing.conditionNotes ?? '',
    knownIssues: listing.knownIssues ?? '',
    isRunning: listing.isRunning,
    conditionRating: listing.conditionRating ?? '',
    locationCountry: listing.locationCountry,
    locationCity: listing.locationCity,
    locationRegion: listing.locationRegion ?? '',
    startingPrice: Number(listing.startingPrice),
    reservePrice: listing.reservePrice ? Number(listing.reservePrice) : '',
    currency: listing.currency,
  })

  const statusBadge = STATUS_BADGES[listing.status]

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveClick = () => {
    if (requiresOverride) {
      setShowOverrideDialog(true)
    } else {
      handleSave(false)
    }
  }

  const handleSave = async (withOverride: boolean) => {
    setIsSaving(true)
    setShowOverrideDialog(false)
    try {
      // Prepare data for API
      const updateData: Record<string, unknown> = {
        title: formData.title,
        make: formData.make,
        model: formData.model,
        year: Number(formData.year),
        mileage: formData.mileage ? Number(formData.mileage) : undefined,
        vin: formData.vin || undefined,
        category: formData.category,
        description: formData.description,
        conditionNotes: formData.conditionNotes || undefined,
        knownIssues: formData.knownIssues || undefined,
        isRunning: formData.isRunning,
        conditionRating: formData.conditionRating ? Number(formData.conditionRating) : undefined,
        locationCountry: formData.locationCountry,
        locationCity: formData.locationCity,
        locationRegion: formData.locationRegion || undefined,
        startingPrice: Number(formData.startingPrice),
        reservePrice: formData.reservePrice ? Number(formData.reservePrice) : undefined,
        currency: formData.currency,
      }

      // Add override flag if needed
      if (withOverride) {
        updateData._adminOverride = true
      }

      const response = await fetch(`/api/admin/listings/${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        // Check if it's a "requires override" error
        if (error.error?.details?.requiresOverride) {
          setShowOverrideDialog(true)
          return
        }
        throw new Error(error.error?.message || 'Failed to save')
      }

      toast.success('Listing updated successfully')
      router.push(`/admin/listings/${listing.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save listing')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) {
      return
    }

    setIsAddingImage(true)
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newImageUrl }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to add image')
      }

      const { data } = await response.json()
      setMedia((prev) => [...prev, data.media])
      setNewImageUrl('')
      toast.success('Image added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add image')
    } finally {
      setIsAddingImage(false)
    }
  }

  const handleDeleteImage = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to delete image')
      }

      setMedia((prev) => prev.filter((m) => m.id !== mediaId))
      toast.success('Image deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete image')
    }
  }

  const handleSetPrimary = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/admin/listings/${listing.id}/media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, isPrimary: true }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to set primary')
      }

      setMedia((prev) =>
        prev.map((m) => ({
          ...m,
          isPrimary: m.id === mediaId,
        }))
      )
      toast.success('Primary image updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set primary image')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/listings/${listing.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Listing</h1>
            <p className="text-muted-foreground">
              {listing.year} {listing.make} {listing.model}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          <Button onClick={handleSaveClick} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Warning for restricted listings */}
      {requiresOverride && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Restricted Listing</AlertTitle>
          <AlertDescription>
            {hasActiveBids ? (
              <>
                This listing has an <strong>active auction with {listing.auction?.bidCount} bid(s)</strong>.
                Editing requires admin override and will be logged with high severity.
              </>
            ) : (
              <>
                This listing is in <strong>{listing.status}</strong> status.
                Editing requires admin override confirmation.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="make">Make</Label>
                  <Select
                    value={formData.make}
                    onValueChange={(value) => handleInputChange('make', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_MAKES.map((make) => (
                        <SelectItem key={make} value={make}>
                          {make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="mileage">Mileage</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => handleInputChange('mileage', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) => handleInputChange('vin', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="conditionNotes">Condition Notes</Label>
                <Textarea
                  id="conditionNotes"
                  value={formData.conditionNotes}
                  onChange={(e) => handleInputChange('conditionNotes', e.target.value)}
                  rows={3}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="knownIssues">Known Issues</Label>
                <Textarea
                  id="knownIssues"
                  value={formData.knownIssues}
                  onChange={(e) => handleInputChange('knownIssues', e.target.value)}
                  rows={3}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Media Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Media ({media.length} images)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Image by URL */}
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddImage}
                  disabled={isAddingImage || !newImageUrl.trim()}
                  className="gap-2"
                >
                  {isAddingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>

              {/* Image Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
                  >
                    <Image
                      src={item.publicUrl}
                      alt={`Image ${item.position + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    {item.isPrimary && (
                      <Badge className="absolute left-2 top-2 gap-1" variant="default">
                        <Star className="h-3 w-3" />
                        Primary
                      </Badge>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      {!item.isPrimary && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetPrimary(item.id)}
                          className="gap-1"
                        >
                          <Star className="h-3 w-3" />
                          Set Primary
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImage(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
                      <GripVertical className="h-3 w-3" />
                      {item.position + 1}
                    </div>
                  </div>
                ))}
              </div>

              {media.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No images yet. Add images by pasting URLs above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Condition */}
          <Card>
            <CardHeader>
              <CardTitle>Condition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isRunning">Is Running</Label>
                <Switch
                  id="isRunning"
                  checked={formData.isRunning}
                  onCheckedChange={(checked) => handleInputChange('isRunning', checked)}
                />
              </div>
              <div>
                <Label htmlFor="conditionRating">Condition Rating</Label>
                <Select
                  value={String(formData.conditionRating)}
                  onValueChange={(value) => handleInputChange('conditionRating', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_RATINGS.map((rating) => (
                      <SelectItem key={rating.value} value={String(rating.value)}>
                        {rating.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="locationCountry">Country</Label>
                <Select
                  value={formData.locationCountry}
                  onValueChange={(value) => handleInputChange('locationCountry', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EU_COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="locationCity">City</Label>
                <Input
                  id="locationCity"
                  value={formData.locationCity}
                  onChange={(e) => handleInputChange('locationCity', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="locationRegion">Region</Label>
                <Input
                  id="locationRegion"
                  value={formData.locationRegion}
                  onChange={(e) => handleInputChange('locationRegion', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startingPrice">Starting Price</Label>
                <Input
                  id="startingPrice"
                  type="number"
                  value={formData.startingPrice}
                  onChange={(e) => handleInputChange('startingPrice', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reservePrice">Reserve Price</Label>
                <Input
                  id="reservePrice"
                  type="number"
                  value={formData.reservePrice}
                  onChange={(e) => handleInputChange('reservePrice', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Seller Info (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>Seller</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>{listing.seller.name || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate max-w-[150px]">{listing.seller.email}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Override Confirmation Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Admin Override Required
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              {hasActiveBids ? (
                <p>
                  This listing has an <strong>active auction with {listing.auction?.bidCount} bid(s)</strong>.
                  Editing it may affect bidders and could be considered fraudulent behavior.
                </p>
              ) : (
                <p>
                  This listing is in <strong>{listing.status}</strong> status and is normally locked from editing.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                This action will be logged with high severity in the audit trail.
                Are you sure you want to proceed?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Override & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
