
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default async function AdminDashboardPage() {
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

  return <AdminDashboard />
}
