
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserDashboard } from '@/components/dashboard/user-dashboard'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (!session.user?.isProfileComplete) {
    redirect('/profile/complete')
  }

  // Redirect admins to their specific dashboard
  if (session.user?.role === 'ADMIN') {
    redirect('/admin/dashboard')
  }

  return <UserDashboard />
}
