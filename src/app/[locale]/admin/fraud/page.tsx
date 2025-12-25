import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { FraudDashboardClient } from './fraud-dashboard-client'

export const metadata = {
  title: 'Fraud Alerts - Admin',
}

export default async function AdminFraudPage() {
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
        <h1 className="text-3xl font-bold">Fraud Alerts</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor and investigate suspicious activity
        </p>
      </div>

      <FraudDashboardClient />
    </div>
  )
}
