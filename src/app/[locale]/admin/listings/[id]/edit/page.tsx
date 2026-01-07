import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminListingEditClient } from './admin-listing-edit-client'

type AdminListingEditPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: AdminListingEditPageProps) {
  const { id } = await params
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true },
  })

  return {
    title: listing ? `Edit: ${listing.title}` : 'Edit Listing - Admin',
    description: 'Edit listing details and media',
  }
}

export default async function AdminListingEditPage({ params }: AdminListingEditPageProps) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin/listings')
  }

  // Check if user has admin/moderator role (not just reviewer - editing requires higher privileges)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
    redirect('/')
  }

  // Fetch full listing details including all media
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      media: {
        orderBy: { position: 'asc' },
      },
      auction: {
        select: {
          id: true,
          status: true,
          bidCount: true,
        },
      },
    },
  })

  if (!listing) {
    notFound()
  }

  return (
    <div className="container py-8">
      <AdminListingEditClient listing={listing} />
    </div>
  )
}
