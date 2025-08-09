
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProfileCompleteForm } from '@/components/profile/profile-complete-form'

export default async function ProfileCompletePage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user?.isProfileComplete) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Please complete your profile to continue using ScripTrack</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <ProfileCompleteForm />
        </div>
      </div>
    </div>
  )
}
