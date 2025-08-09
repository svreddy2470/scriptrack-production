
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { ScriptEditFormEnhanced } from '@/components/scripts/script-edit-form-enhanced'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'

interface Props {
  params: { id: string }
}

export const metadata: Metadata = {
  title: 'Edit Script - ScripTrack',
  description: 'Edit script details and upload new versions'
}

// Fetch script data
async function getScript(id: string, session: any) {
  try {
    // Since this is a server component, we can't use fetch with relative URLs
    // We need to construct the full URL or use Prisma directly
    const { prisma } = await import('@/lib/db')
    
    const script = await prisma.script.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            photoUrl: true
          }
        },
        files: {
          where: { isLatest: true },
          include: {
            uploader: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!script) {
      return null
    }

    // Check permissions
    const isOwner = script.submittedBy === session.user.id
    const canManage = session.user.role === 'ADMIN' || session.user.role === 'EXECUTIVE'
    
    if (!isOwner && !canManage) {
      return null
    }

    return script
  } catch (error) {
    console.error('Error fetching script:', error)
    return null
  }
}

export default async function EditScriptPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const script = await getScript(params.id, session)
  
  if (!script) {
    notFound()
  }

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScriptEditFormEnhanced script={script} />
      </div>
    </EnhancedLayout>
  )
}
