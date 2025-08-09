
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TeamPage } from '@/components/team/team-page'

export default async function TeamPageRoute() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (!session.user?.isProfileComplete) {
    redirect('/profile/complete')
  }

  return <TeamPage />
}
