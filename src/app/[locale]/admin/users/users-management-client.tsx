'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserData } from '@/types'

type UsersManagementClientProps = {
  isAdmin: boolean
}

export function UsersManagementClient({ isAdmin }: UsersManagementClientProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    type: 'suspend' | 'unsuspend' | 'verify' | 'change_role' | 'ban' | 'unban' | 'view' | null
    user: UserData | null
  }>({ type: null, user: null })
  const [actionReason, setActionReason] = useState('')
  const [newRole, setNewRole] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) {params.set('search', search)}
      if (roleFilter) {params.set('role', roleFilter)}
      if (statusFilter) {params.set('status', statusFilter)}
      params.set('page', page.toString())

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {throw new Error('Failed to fetch users')}

      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleAction = async () => {
    if (!actionDialog.user || !actionDialog.type || actionDialog.type === 'view') {return}

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/users/${actionDialog.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionDialog.type,
          reason: actionReason,
          role: newRole || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Action failed')
      }

      toast.success(`User ${actionDialog.type} successfully`)
      setActionDialog({ type: null, user: null })
      setActionReason('')
      setNewRole('')
      fetchUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setProcessing(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      ADMIN: 'bg-destructive text-destructive-foreground',
      MODERATOR: 'bg-secondary text-secondary-foreground',
      REVIEWER: 'bg-primary text-primary-foreground',
      SELLER: 'bg-success text-success-foreground',
      USER: 'bg-muted text-muted-foreground',
    }
    return <Badge className={variants[role] || 'bg-muted text-muted-foreground'}>{role}</Badge>
  }

  const getStatusBadge = (user: UserData) => {
    if (user.bannedAt) {
      return <Badge variant="destructive">Banned</Badge>
    }
    if (!user.emailVerified) {
      return <Badge variant="warning">Unverified</Badge>
    }
    if (!user.biddingEnabled) {
      return <Badge variant="destructive">Suspended</Badge>
    }
    return <Badge variant="success">Active</Badge>
  }

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter || '__all__'} onValueChange={(v) => { setRoleFilter(v === '__all__' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="SELLER">Seller</SelectItem>
            <SelectItem value="REVIEWER">Reviewer</SelectItem>
            <SelectItem value="MODERATOR">Moderator</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter || '__all__'} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <User className="mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Activity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{user.name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                      <td className="px-4 py-3">{getStatusBadge(user)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>{user._count.listings} listings</p>
                          <p className="text-muted-foreground">{user._count.bids} bids</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
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
                              onClick={() => setActionDialog({ type: 'view', user })}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!user.emailVerified && (
                              <DropdownMenuItem
                                onClick={() => setActionDialog({ type: 'verify', user })}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify Email
                              </DropdownMenuItem>
                            )}
                            {user.biddingEnabled ? (
                              <DropdownMenuItem
                                onClick={() => setActionDialog({ type: 'suspend', user })}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Suspend Bidding
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setActionDialog({ type: 'unsuspend', user })}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Enable Bidding
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setNewRole(user.role)
                                    setActionDialog({ type: 'change_role', user })
                                  }}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                                {user.bannedAt ? (
                                  <DropdownMenuItem
                                    onClick={() => setActionDialog({ type: 'unban', user })}
                                    className="text-success"
                                  >
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Unban User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => setActionDialog({ type: 'ban', user })}
                                    className="text-destructive"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Ban User
                                  </DropdownMenuItem>
                                )}
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
          setActionDialog({ type: null, user: null })
          setActionReason('')
          setNewRole('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'suspend' && 'Suspend User'}
              {actionDialog.type === 'unsuspend' && 'Enable Bidding'}
              {actionDialog.type === 'verify' && 'Verify Email'}
              {actionDialog.type === 'change_role' && 'Change User Role'}
              {actionDialog.type === 'ban' && 'Ban User'}
              {actionDialog.type === 'unban' && 'Unban User'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.user?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionDialog.type === 'change_role' && (
              <div>
                <label className="text-sm font-medium">New Role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="SELLER">Seller</SelectItem>
                    <SelectItem value="REVIEWER">Reviewer</SelectItem>
                    <SelectItem value="MODERATOR">Moderator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">
                Reason {['ban', 'unban'].includes(actionDialog.type || '') ? '(required)' : '(optional)'}
              </label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter reason for this action..."
                className="mt-1"
                rows={3}
              />
            </div>

            {actionDialog.type === 'ban' && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm">
                <ShieldAlert className="mb-1 h-4 w-4" />
                This action will disable the user&apos;s account and bidding. They will not be able to participate in auctions until unbanned.
              </div>
            )}

            {actionDialog.type === 'unban' && actionDialog.user?.banReason && (
              <div className="rounded-lg bg-warning/10 p-3 text-sm">
                <div className="font-medium mb-1">Original ban reason:</div>
                <div className="text-xs">{actionDialog.user.banReason}</div>
                {actionDialog.user.bannedAt && (
                  <div className="text-xs mt-1">
                    Banned on: {new Date(actionDialog.user.bannedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ type: null, user: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                processing ||
                (actionDialog.type === 'change_role' && !newRole) ||
                (['ban', 'unban'].includes(actionDialog.type || '') && !actionReason.trim())
              }
              variant={actionDialog.type === 'ban' ? 'destructive' : 'default'}
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={actionDialog.type === 'view'}
        onOpenChange={() => setActionDialog({ type: null, user: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {actionDialog.user && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <p className="font-medium">{actionDialog.user.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{actionDialog.user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Role</label>
                  <p>{getRoleBadge(actionDialog.user.role)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <p>{getStatusBadge(actionDialog.user)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Listings</label>
                  <p className="font-medium">{actionDialog.user._count.listings}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Bids</label>
                  <p className="font-medium">{actionDialog.user._count.bids}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Joined</label>
                  <p className="font-medium">
                    {new Date(actionDialog.user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">User ID</label>
                  <p className="font-mono text-xs">{actionDialog.user.id}</p>
                </div>
              </div>

              {/* Ban History Section */}
              {(actionDialog.user.bannedAt || actionDialog.user.unbannedAt) && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-semibold mb-3">Ban History</h3>
                  <div className="space-y-3">
                    {actionDialog.user.bannedAt && (
                      <div className="rounded-lg bg-destructive/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Ban className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">Currently Banned</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Banned on:</span>{' '}
                            {new Date(actionDialog.user.bannedAt).toLocaleString()}
                          </p>
                          {actionDialog.user.banReason && (
                            <p>
                              <span className="text-muted-foreground">Reason:</span>{' '}
                              {actionDialog.user.banReason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {actionDialog.user.unbannedAt && !actionDialog.user.bannedAt && (
                      <div className="rounded-lg bg-success/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="h-4 w-4 text-success" />
                          <span className="font-medium text-success">Previously Banned (Unbanned)</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Unbanned on:</span>{' '}
                            {new Date(actionDialog.user.unbannedAt).toLocaleString()}
                          </p>
                          {actionDialog.user.unbanReason && (
                            <p>
                              <span className="text-muted-foreground">Reason:</span>{' '}
                              {actionDialog.user.unbanReason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setActionDialog({ type: null, user: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
