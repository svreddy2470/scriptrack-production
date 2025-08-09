
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ScriptsGrid } from '@/components/scripts/scripts-grid'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'

export const metadata: Metadata = {
  title: 'Scripts - ScripTrack',
  description: 'Browse and manage submitted scripts'
}

export default async function ScriptsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScriptsGrid />
      </div>
    </EnhancedLayout>
  )
}
