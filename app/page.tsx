
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Check if profile is complete
  if (!session.user?.isProfileComplete) {
    redirect('/profile/complete')
  }

  // Redirect based on role
  if (session.user?.role === 'ADMIN') {
    redirect('/admin/dashboard')
  } else {
    redirect('/dashboard')
  }
}
