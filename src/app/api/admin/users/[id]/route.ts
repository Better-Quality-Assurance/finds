import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { logAuditEvent } from '@/services/audit.service'
import { updateUserSchema } from '@/lib/validation-schemas'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET - Get user details
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!admin || !['ADMIN', 'MODERATOR'].includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        emailVerified: true,
        biddingEnabled: true,
        stripeCustomerId: true,
        marketingConsent: true,
        preferredLanguage: true,
        preferredCurrency: true,
        bannedAt: true,
        banReason: true,
        unbannedAt: true,
        unbanReason: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            listings: true,
            bids: true,
            fraudAlerts: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get recent activity
    const [recentBids, recentListings, fraudAlerts] = await Promise.all([
      prisma.bid.findMany({
        where: { bidderId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          auction: {
            include: {
              listing: {
                select: { title: true },
              },
            },
          },
        },
      }),
      prisma.listing.findMany({
        where: { sellerId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.fraudAlert.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    return NextResponse.json({
      user,
      recentBids,
      recentListings,
      fraudAlerts,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}

// PUT - Update user (suspend, unsuspend, verify, change role, ban)
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!admin || !['ADMIN', 'MODERATOR'].includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { action, role, reason } = updateUserSchema.parse(body)

    // Only ADMIN can change roles, ban, or unban
    if (['change_role', 'ban', 'unban'].includes(action) && admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can perform this action' },
        { status: 403 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent modifying admins
    if (targetUser.role === 'ADMIN' && session.user.id !== id) {
      return NextResponse.json(
        { error: 'Cannot modify admin users' },
        { status: 403 }
      )
    }

    let updateData: Record<string, unknown> = {}
    let auditAction = ''

    switch (action) {
      case 'suspend':
        updateData = { biddingEnabled: false }
        auditAction = 'USER_SUSPENDED'
        break

      case 'unsuspend':
        updateData = { biddingEnabled: true }
        auditAction = 'USER_UNSUSPENDED'
        break

      case 'verify':
        updateData = { emailVerified: new Date() }
        auditAction = 'USER_VERIFIED'
        break

      case 'change_role':
        if (!role) {
          return NextResponse.json(
            { error: 'Role is required' },
            { status: 400 }
          )
        }
        updateData = { role }
        auditAction = 'USER_ROLE_CHANGED'
        break

      case 'ban':
        updateData = {
          biddingEnabled: false,
          bannedAt: new Date(),
          banReason: reason || null,
          // Clear sessions would happen via auth system
        }
        auditAction = 'USER_BANNED'
        break

      case 'unban':
        updateData = {
          biddingEnabled: true,
          bannedAt: null,
          banReason: null,
          unbannedAt: new Date(),
          unbanReason: reason || null,
        }
        auditAction = 'USER_UNBANNED'
        break
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        biddingEnabled: true,
      },
    })

    // Log audit event
    await logAuditEvent({
      actorId: session.user.id,
      action: auditAction,
      resourceType: 'USER',
      resourceId: id,
      details: {
        action,
        reason,
        previousRole: targetUser.role,
        newRole: role,
      },
      severity: ['ban', 'unban'].includes(action) ? 'HIGH' : 'MEDIUM',
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
