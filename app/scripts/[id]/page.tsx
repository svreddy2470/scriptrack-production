
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { ScriptDetailView } from '@/components/scripts/script-detail-view'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Use static metadata to avoid build-time API calls that require authentication
  return {
    title: 'Script Details - ScripTrack',
    description: 'View script details and manage submissions'
  }
}

export default async function ScriptDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScriptDetailView scriptId={params.id} />
      </div>
    </EnhancedLayout>
  )
}
