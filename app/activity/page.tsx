
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default async function ActivityPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (!session.user?.isProfileComplete) {
    redirect('/profile/complete')
  }

  // Allow admins to access activity page (removed redirect)

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Activity Timeline
              </h1>
              <p className="text-gray-600">Track all recent activities and updates in ScripTrack</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline limit={50} showHeader={false} />
          </CardContent>
        </Card>
      </div>
    </EnhancedLayout>
  )
}
