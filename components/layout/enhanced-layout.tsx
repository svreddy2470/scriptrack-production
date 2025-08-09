
"use client"

import { useSession } from 'next-auth/react'
import { Navigation } from './navigation'
import { Breadcrumbs } from './breadcrumbs'
import { QuickActions } from './quick-actions'

interface EnhancedLayoutProps {
  children: React.ReactNode
  showBreadcrumbs?: boolean
  showQuickActions?: boolean
  className?: string
}

export function EnhancedLayout({ 
  children, 
  showBreadcrumbs = true, 
  showQuickActions = true,
  className = "min-h-screen bg-gray-50"
}: EnhancedLayoutProps) {
  const { data: session } = useSession()

  // Don't show navigation elements on auth pages
  if (!session?.user) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={className}>
      {/* Main Navigation */}
      <Navigation />
      
      {/* Breadcrumbs */}
      {showBreadcrumbs && <Breadcrumbs />}
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Quick Actions Floating Button */}
      {showQuickActions && <QuickActions />}
    </div>
  )
}
