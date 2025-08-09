

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'
import { MeetingManager } from '@/components/meetings/meeting-manager'

export default async function MeetingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (!session.user?.isProfileComplete) {
    redirect('/profile/complete')
  }

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MeetingManager />
      </div>
    </EnhancedLayout>
  )
}
