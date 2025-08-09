
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'
import { AdminReportsDashboard } from '@/components/admin/admin-reports-dashboard'

export const metadata: Metadata = {
  title: 'Team Activity Reports - ScripTrack Admin',
  description: 'Comprehensive team activity reporting and analytics'
}

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Only admins and executives can access reports
  if (!['ADMIN', 'EXECUTIVE'].includes(session.user.role || '')) {
    redirect('/dashboard')
  }

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Team Activity Reports
            </h1>
            <p className="text-gray-600">
              Comprehensive analytics and insights for management oversight
            </p>
          </div>
          
          <AdminReportsDashboard />
        </div>
      </div>
    </EnhancedLayout>
  )
}
