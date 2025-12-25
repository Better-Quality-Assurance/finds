import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UsersManagementClient } from './users-management-client'

export const metadata = {
  title: 'User Management - Admin',
}

export default async function AdminUsersPage() {
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
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="mt-2 text-muted-foreground">
          Search, view, and manage user accounts
        </p>
      </div>

      <UsersManagementClient isAdmin={user.role === 'ADMIN'} />
    </div>
  )
}
