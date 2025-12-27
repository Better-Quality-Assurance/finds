import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminListingsClient } from './admin-listings-client'

export const metadata = {
  title: 'Manage Listings - Admin',
  description: 'Review and approve vehicle listings',
}

export default async function AdminListingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin/listings')
  }

  // Check if user has admin/moderator/reviewer role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
    redirect('/')
  }

  // Get initial listings (pending review)
  const listings = await prisma.listing.findMany({
    where: { status: 'PENDING_REVIEW' },
    orderBy: { createdAt: 'asc' },
    take: 20,
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      media: {
        where: { type: 'PHOTO' },
        take: 4,
        orderBy: { position: 'asc' },
        select: {
          id: true,
          publicUrl: true,
          originalUrl: true,
          type: true,
          category: true,
          licensePlateDetected: true,
          licensePlateBlurred: true,
        },
      },
      _count: {
        select: { media: true },
      },
    },
  })

  // Get counts by status
  const statusCounts = await prisma.listing.groupBy({
    by: ['status'],
    _count: { status: true },
  })

  const counts = statusCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count.status
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Manage Listings</h1>
        <p className="mt-1 text-muted-foreground">
          Review, approve, or reject vehicle listings
        </p>
      </div>

      <AdminListingsClient
        initialListings={listings}
        statusCounts={counts}
        userRole={user.role}
      />
    </div>
  )
}
