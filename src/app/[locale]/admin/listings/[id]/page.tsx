import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminListingDetailClient } from './admin-listing-detail-client'

type AdminListingDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: AdminListingDetailPageProps) {
  const { id } = await params
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true },
  })

  return {
    title: listing ? `${listing.title} - Admin Review` : 'Listing - Admin',
    description: 'Review listing details and media',
  }
}

export default async function AdminListingDetailPage({ params }: AdminListingDetailPageProps) {
  const session = await auth()
  const { id } = await params

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

  // Fetch full listing details including all media with license plate detection
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              bids: true,
            },
          },
        },
      },
      media: {
        select: {
          id: true,
          type: true,
          publicUrl: true,
          originalUrl: true,
          thumbnailUrl: true,
          position: true,
          isPrimary: true,
          category: true,
          caption: true,
          fileSize: true,
          mimeType: true,
          width: true,
          height: true,
          licensePlateDetected: true,
          licensePlateBlurred: true,
          plateDetectionData: true,
          createdAt: true,
        },
        orderBy: { position: 'asc' },
      },
      aiAnalysis: {
        select: {
          id: true,
          decision: true,
          confidenceScore: true,
          approvalReasoning: true,
          issues: true,
        },
      },
      aiCarReview: {
        select: {
          id: true,
          overallScore: true,
          conditionSummary: true,
        },
      },
      auction: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  })

  if (!listing) {
    notFound()
  }

  return (
    <div className="container py-8">
      <AdminListingDetailClient listing={listing} userRole={user.role} />
    </div>
  )
}
