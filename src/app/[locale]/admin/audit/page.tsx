import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuditLogClient } from './audit-log-client'

export const metadata = {
  title: 'Audit Log - Admin',
}

export default async function AdminAuditPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  // Only ADMIN can view audit logs
  if (!user || user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="mt-2 text-muted-foreground">
          View system activity and security events
        </p>
      </div>

      <AuditLogClient />
    </div>
  )
}
