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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Search,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditLogEntry, AuditStats } from '@/types'

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('action', search)
      if (resourceType) params.set('resourceType', resourceType)
      if (severity) params.set('severity', severity)
      if (status) params.set('status', status)
      params.set('page', page.toString())

      const response = await fetch(`/api/admin/audit?${params}`)
      if (!response.ok) throw new Error('Failed to fetch logs')

      const data = await response.json()
      setLogs(data.logs)
      setStats(data.stats)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [search, resourceType, severity, status, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null
    const variants: Record<string, string> = {
      CRITICAL: 'bg-destructive text-destructive-foreground',
      HIGH: 'bg-destructive text-destructive-foreground',
      MEDIUM: 'bg-warning text-warning-foreground',
      LOW: 'bg-primary text-primary-foreground',
    }
    return <Badge className={variants[severity]}>{severity}</Badge>
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'FAILURE':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'BLOCKED':
        return <AlertCircle className="h-4 w-4 text-warning" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events Today</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failedToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Severity</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {stats.highSeverityToday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Action</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {stats.topActions[0]?.action
                  ? formatAction(stats.topActions[0].action)
                  : 'None'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>

        <Select value={resourceType} onValueChange={(v) => { setResourceType(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Resource Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Resources</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="LISTING">Listing</SelectItem>
            <SelectItem value="AUCTION">Auction</SelectItem>
            <SelectItem value="BID">Bid</SelectItem>
            <SelectItem value="PAYMENT">Payment</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1) }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Severity</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILURE">Failure</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Resource</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{formatAction(log.action)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.actor?.email || log.actorEmail || 'System'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-muted-foreground">{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="ml-1 font-mono text-xs">
                            {log.resourceId.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getSeverityBadge(log.severity)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(log.status)}
                          <span className="text-sm">{log.status || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Action</label>
                  <p className="font-medium">{formatAction(selectedLog.action)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Time</label>
                  <p className="font-medium">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Actor</label>
                  <p className="font-medium">
                    {selectedLog.actor?.email || selectedLog.actorEmail || 'System'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">IP Address</label>
                  <p className="font-mono text-sm">{selectedLog.actorIp || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Resource</label>
                  <p className="font-medium">
                    {selectedLog.resourceType}
                    {selectedLog.resourceId && `: ${selectedLog.resourceId}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(selectedLog.status)}
                    <span>{selectedLog.status || '-'}</span>
                  </div>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <label className="text-sm text-muted-foreground">Error</label>
                  <p className="mt-1 rounded bg-destructive/10 p-2 text-sm text-destructive">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground">Details</label>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {selectedLog.changes && (
                <div>
                  <label className="text-sm text-muted-foreground">Changes</label>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
