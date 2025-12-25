'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Download, Trash2, FileText, Clock, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type DataRequestType = 'EXPORT' | 'DELETE'
type DataRequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'

interface DataRequest {
  id: string
  requestType: DataRequestType
  status: DataRequestStatus
  createdAt: string
  completedAt: string | null
  exportFilePath: string | null
  exportExpiresAt: string | null
  rejectionReason: string | null
}

const STATUS_CONFIG: Record<
  DataRequestStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'default', icon: AlertCircle },
  COMPLETED: { label: 'Completed', variant: 'outline', icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  const [dataRequests, setDataRequests] = useState<DataRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreatingRequest, setIsCreatingRequest] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Fetch existing data requests
  useEffect(() => {
    fetchDataRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDataRequests = async () => {
    try {
      const response = await fetch('/api/account/data-request')
      if (!response.ok) {
        throw new Error('Failed to fetch data requests')
      }
      const data = await response.json()
      setDataRequests(data.dataRequests || [])
    } catch (error) {
      console.error('Error fetching data requests:', error)
      toast.error(t('fetchRequestsError'))
    } finally {
      setLoading(false)
    }
  }

  const createDataRequest = async (requestType: DataRequestType) => {
    setIsCreatingRequest(true)
    try {
      const response = await fetch('/api/account/data-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create request')
      }

      toast.success(
        requestType === 'EXPORT'
          ? t('exportRequestCreated')
          : t('deleteRequestCreated')
      )

      // Refresh the data requests list
      await fetchDataRequests()
    } catch (error: any) {
      console.error('Error creating data request:', error)
      toast.error(error.message || t('createRequestError'))
    } finally {
      setIsCreatingRequest(false)
      setShowExportDialog(false)
      setShowDeleteDialog(false)
    }
  }

  const handleExportClick = () => {
    setShowExportDialog(true)
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const hasPendingExportRequest = dataRequests.some(
    (req) => req.requestType === 'EXPORT' && ['PENDING', 'PROCESSING'].includes(req.status)
  )

  const hasPendingDeleteRequest = dataRequests.some(
    (req) => req.requestType === 'DELETE' && ['PENDING', 'PROCESSING'].includes(req.status)
  )

  const exportRequests = dataRequests.filter((req) => req.requestType === 'EXPORT')
  const deleteRequests = dataRequests.filter((req) => req.requestType === 'DELETE')

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('description')}</p>
      </div>

      {/* GDPR Data Rights Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('gdprTitle')}
          </CardTitle>
          <CardDescription>{t('gdprDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Data Section */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{t('exportDataTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('exportDataDescription')}
                </p>
              </div>
              <Button
                onClick={handleExportClick}
                disabled={hasPendingExportRequest || isCreatingRequest}
                size="sm"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                {t('requestExport')}
              </Button>
            </div>

            {/* Export Requests List */}
            {exportRequests.length > 0 && (
              <div className="mt-4 space-y-2">
                {exportRequests.map((request) => {
                  const statusConfig = STATUS_CONFIG[request.status]
                  const StatusIcon = statusConfig.icon

                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t('dataExport')}</span>
                            <Badge variant={statusConfig.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {t(`status.${request.status.toLowerCase()}`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('requestedAgo', {
                              time: formatDistanceToNow(new Date(request.createdAt), {
                                addSuffix: true,
                              }),
                            })}
                          </p>
                        </div>
                      </div>

                      {request.status === 'COMPLETED' && request.exportFilePath && (
                        <Button size="sm" variant="default" asChild>
                          <a href={`/api/account/data-export/${request.id}`} download>
                            <Download className="mr-2 h-4 w-4" />
                            {t('downloadData')}
                          </a>
                        </Button>
                      )}

                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <p className="text-xs text-destructive">{request.rejectionReason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t" />

          {/* Delete Account Section */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">{t('deleteAccountTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('deleteAccountDescription')}
                </p>
              </div>
              <Button
                onClick={handleDeleteClick}
                disabled={hasPendingDeleteRequest || isCreatingRequest}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('requestDeletion')}
              </Button>
            </div>

            {/* Delete Requests List */}
            {deleteRequests.length > 0 && (
              <div className="mt-4 space-y-2">
                {deleteRequests.map((request) => {
                  const statusConfig = STATUS_CONFIG[request.status]
                  const StatusIcon = statusConfig.icon

                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t('accountDeletion')}</span>
                            <Badge variant={statusConfig.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {t(`status.${request.status.toLowerCase()}`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('requestedAgo', {
                              time: formatDistanceToNow(new Date(request.createdAt), {
                                addSuffix: true,
                              }),
                            })}
                          </p>
                        </div>
                      </div>

                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <p className="text-xs text-destructive">{request.rejectionReason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Data Confirmation Dialog */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exportDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('exportDialogDescription')}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>{t('exportIncludesProfile')}</li>
                <li>{t('exportIncludesBids')}</li>
                <li>{t('exportIncludesListings')}</li>
                <li>{t('exportIncludesActivity')}</li>
              </ul>
              <p className="mt-3 text-sm font-medium">{t('exportProcessingTime')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingRequest}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => createDataRequest('EXPORT')}
              disabled={isCreatingRequest}
            >
              {isCreatingRequest ? t('creating') : t('confirmExport')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {t('deleteDialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">{t('deleteDialogWarning')}</p>
              <p>{t('deleteDialogDescription')}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>{t('deleteRemovesProfile')}</li>
                <li>{t('deleteRemovesBids')}</li>
                <li>{t('deleteRemovesListings')}</li>
                <li>{t('deleteIrreversible')}</li>
              </ul>
              <p className="mt-3 text-sm font-medium">{t('deleteGracePeriod')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingRequest}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => createDataRequest('DELETE')}
              disabled={isCreatingRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCreatingRequest ? t('creating') : t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
