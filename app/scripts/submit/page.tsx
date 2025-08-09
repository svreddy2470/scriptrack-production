
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ScriptSubmissionForm } from '@/components/scripts/script-submission-form'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'

export const metadata: Metadata = {
  title: 'Submit Script - ScripTrack',
  description: 'Submit your script for review'
}

export default async function SubmitScriptPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Only allow non-READER roles to submit scripts
  if (session.user.role === 'READER') {
    redirect('/scripts')
  }

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScriptSubmissionForm />
      </div>
    </EnhancedLayout>
  )
}
