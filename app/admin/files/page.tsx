
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'
import { AdminFileManagement } from '@/components/admin/admin-file-management'

export default async function AdminFilesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  if (!session.user?.isProfileComplete) {
    redirect('/profile/complete')
  }

  return (
    <EnhancedLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AdminFileManagement />
      </div>
    </EnhancedLayout>
  )
}
