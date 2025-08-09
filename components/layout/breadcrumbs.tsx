
"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs() {
  const pathname = usePathname()
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard' }
    ]

    // Build breadcrumbs based on path
    let currentPath = ''
    
    for (let i = 0; i < segments.length; i++) {
      currentPath += `/${segments[i]}`
      const isLast = i === segments.length - 1
      
      switch (segments[i]) {
        case 'dashboard':
          breadcrumbs.push({ label: 'Dashboard', href: isLast ? undefined : currentPath })
          break
        case 'scripts':
          breadcrumbs.push({ label: 'Scripts', href: isLast ? undefined : currentPath })
          break
        case 'submit':
          breadcrumbs.push({ label: 'Submit Script', href: isLast ? undefined : currentPath })
          break
        case 'edit':
          breadcrumbs.push({ label: 'Edit Script', href: isLast ? undefined : currentPath })
          break
        case 'team':
          breadcrumbs.push({ label: 'Team', href: isLast ? undefined : currentPath })
          break
        case 'profile':
          breadcrumbs.push({ label: 'Profile', href: isLast ? undefined : currentPath })
          break
        case 'admin':
          breadcrumbs.push({ label: 'Admin', href: isLast ? undefined : currentPath })
          break
        case 'auth':
          breadcrumbs.push({ label: 'Authentication', href: isLast ? undefined : currentPath })
          break
        case 'signin':
          breadcrumbs.push({ label: 'Sign In', href: isLast ? undefined : currentPath })
          break
        default:
          // For dynamic routes like [id], try to make them more readable
          if (segments[i-1] === 'scripts' && segments[i].length > 10) {
            breadcrumbs.push({ label: 'Script Details', href: isLast ? undefined : currentPath })
          } else {
            // Capitalize first letter for generic segments
            const label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1)
            breadcrumbs.push({ label, href: isLast ? undefined : currentPath })
          }
          break
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  // Don't show breadcrumbs on auth pages
  if (pathname.startsWith('/auth')) {
    return null
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center space-x-2 py-3">
          <Home className="w-4 h-4 text-gray-400" />
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />}
              {crumb.href ? (
                <Link 
                  href={crumb.href}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-sm font-medium text-gray-900">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
