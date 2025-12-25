import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuctionsManagementClient } from './auctions-management-client'

export const metadata = {
  title: 'Auction Management - Admin',
}

export default async function AdminAuctionsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
    redirect('/')
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Auction Management</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor and manage active auctions
        </p>
      </div>

      <AuctionsManagementClient />
    </div>
  )
}
