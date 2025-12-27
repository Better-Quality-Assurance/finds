import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AISettingsClient } from './ai-settings-client'

export const metadata = {
  title: 'AI Settings - Admin',
}

export default async function AdminAISettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  // ADMIN and MODERATOR can view, only ADMIN can edit (enforced in client)
  if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
    redirect('/')
  }

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">AI Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Configure AI models, thresholds, and moderation settings
        </p>
      </div>

      <AISettingsClient isAdmin={isAdmin} />
    </div>
  )
}
