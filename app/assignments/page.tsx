
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'
import { AssignmentManagerClient } from '@/components/assignments/assignment-manager-client'

export const metadata: Metadata = {
  title: 'Assignments - ScripTrack',
  description: 'Manage and track script assignments'
}

interface AssignmentsPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function AssignmentsPage({ searchParams }: AssignmentsPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if we're showing assignments assigned BY the user or TO the user
  const assignedBy = typeof searchParams.assignedBy === 'string' ? searchParams.assignedBy : undefined
  const showMyAssignments = assignedBy === session.user.id

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {showMyAssignments ? 'My Assignments' : 'My Tasks'}
            </h1>
            <p className="text-gray-600">
              {showMyAssignments 
                ? 'Scripts I\'ve assigned to team members' 
                : 'Scripts assigned to me for review'
              }
            </p>
          </div>
          
          <AssignmentManagerClient 
            mode={showMyAssignments ? 'assigned-by' : 'assigned-to'}
            userId={session.user.id}
          />
        </div>
      </div>
    </EnhancedLayout>
  )
}
