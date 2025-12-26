'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FraudAlert, FraudStats, FraudAlertStatus } from '@/types'

export function FraudDashboardClient() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [stats, setStats] = useState<FraudStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (severityFilter) params.set('severity', severityFilter)

      const response = await fetch(`/api/admin/fraud?${params}`)
      if (!response.ok) throw new Error('Failed to fetch alerts')

      const data = await response.json()
      setAlerts(data.alerts)
      setStats(data.stats)
    } catch (error) {
      toast.error('Failed to load fraud alerts')
    } finally {
      setLoading(false)
    }
  }, [severityFilter])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleReview = async (status: FraudAlertStatus) => {
    if (!selectedAlert) return

    try {
      setReviewing(true)
      const response = await fetch(`/api/admin/fraud/${selectedAlert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: reviewNotes }),
      })

      if (!response.ok) throw new Error('Failed to update alert')

      toast.success('Alert updated')
      setSelectedAlert(null)
      setReviewNotes('')
      fetchAlerts()
    } catch (error) {
      toast.error('Failed to update alert')
    } finally {
      setReviewing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-destructive text-white'
      case 'HIGH':
        return 'bg-warning text-warning-foreground'
      case 'MEDIUM':
        return 'bg-warning text-warning-foreground'
      case 'LOW':
        return 'bg-primary text-white'
      default:
        return 'bg-muted-foreground text-white'
    }
  }

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'SHILL_BIDDING':
      case 'SELLER_IP_MATCH':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case 'COORDINATED_BIDDING':
        return <AlertCircle className="h-4 w-4 text-warning" />
      case 'BID_VELOCITY':
      case 'RAPID_BIDDING':
        return <RefreshCw className="h-4 w-4 text-warning" />
      default:
        return <Shield className="h-4 w-4 text-primary" />
    }
  }

  const formatAlertType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.criticalAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.alertsToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Types</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.alertsByType).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchAlerts} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <CheckCircle className="mb-2 h-12 w-12 text-success" />
              <p className="text-lg font-medium">No open alerts</p>
              <p className="text-muted-foreground">
                All fraud alerts have been reviewed
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    {getAlertTypeIcon(alert.alertType)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatAlertType(alert.alertType)}
                        </span>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {alert.user ? (
                          <span>User: {alert.user.email}</span>
                        ) : (
                          <span>No user associated</span>
                        )}
                        {alert.auctionId && (
                          <span className="ml-2">
                            Auction: {alert.auctionId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getAlertTypeIcon(selectedAlert.alertType)}
              {selectedAlert && formatAlertType(selectedAlert.alertType)}
            </DialogTitle>
            <DialogDescription>
              Review this fraud alert and take appropriate action
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              {/* Alert Details */}
              <div className="rounded-lg bg-muted p-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severity:</span>
                    <Badge className={getSeverityColor(selectedAlert.severity)}>
                      {selectedAlert.severity}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(selectedAlert.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedAlert.user && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User:</span>
                      <span>{selectedAlert.user.email}</span>
                    </div>
                  )}
                  {selectedAlert.auctionId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auction:</span>
                      <span className="font-mono text-xs">{selectedAlert.auctionId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details JSON */}
              <div>
                <h4 className="mb-2 font-medium">Alert Details</h4>
                <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(selectedAlert.details, null, 2)}
                </pre>
              </div>

              {/* Review Notes */}
              <div>
                <h4 className="mb-2 font-medium">Review Notes</h4>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this alert..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => handleReview('INVESTIGATING')}
              disabled={reviewing}
            >
              <Eye className="mr-2 h-4 w-4" />
              Investigate
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview('FALSE_POSITIVE')}
              disabled={reviewing}
            >
              <XCircle className="mr-2 h-4 w-4" />
              False Positive
            </Button>
            <Button
              onClick={() => handleReview('RESOLVED')}
              disabled={reviewing}
            >
              {reviewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
