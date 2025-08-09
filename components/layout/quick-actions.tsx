
"use client"

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  FileText, 
  Users, 
  Settings, 
  Home,
  Upload,
  Search,
  BarChart3,
  Zap
} from 'lucide-react'

export function QuickActions() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  if (!session?.user) {
    return null
  }

  const isAdmin = session.user.role === 'ADMIN'
  const isExecutive = session.user.role === 'EXECUTIVE'
  const canManage = isAdmin || isExecutive

  const quickActions = [
    {
      label: 'Add Script',
      icon: Plus,
      action: () => router.push('/scripts/submit'),
      show: true,
      disabled: pathname === '/scripts/submit'
    },
    {
      label: 'View Scripts',
      icon: FileText,
      action: () => router.push('/scripts'),
      show: true,
      disabled: pathname === '/scripts'
    },
    {
      label: 'Dashboard',
      icon: Home,
      action: () => router.push(isAdmin ? '/admin/dashboard' : '/dashboard'),
      show: true,
      disabled: pathname === '/dashboard' || pathname === '/admin/dashboard'
    },
    {
      label: 'Team',
      icon: Users,
      action: () => router.push('/team'),
      show: true,
      disabled: pathname === '/team'
    },
    {
      label: 'Profile',
      icon: Settings,
      action: () => router.push('/profile'),
      show: true,
      disabled: pathname === '/profile'
    }
  ]

  const adminActions = [
    {
      label: 'Admin Dashboard',
      icon: BarChart3,
      action: () => router.push('/admin/dashboard'),
      show: isAdmin, // Only show for ADMIN users, not EXECUTIVE
      disabled: pathname === '/admin/dashboard'
    }
  ]

  const handleKeyboardShortcut = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'k':
          e.preventDefault()
          // TODO: Open search/command palette
          break
        case '1':
          e.preventDefault()
          router.push('/dashboard')
          break
        case '2':
          e.preventDefault()
          router.push('/scripts')
          break
        case '3':
          e.preventDefault()
          router.push('/scripts/submit')
          break
      }
    }
  }

  // Add keyboard shortcuts
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyboardShortcut)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="lg" 
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
          >
            <Zap className="w-5 h-5 mr-2" />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 mb-2"
          sideOffset={8}
        >
          <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
            Common Actions
          </DropdownMenuLabel>
          {quickActions
            .filter(action => action.show)
            .map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={action.action}
                disabled={action.disabled}
                className="flex items-center cursor-pointer"
              >
                <action.icon className="w-4 h-4 mr-3" />
                {action.label}
                {action.disabled && (
                  <span className="ml-auto text-xs text-gray-400">Current</span>
                )}
              </DropdownMenuItem>
            ))}
          
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
                Admin Actions
              </DropdownMenuLabel>
              {adminActions
                .filter(action => action.show)
                .map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.action}
                    disabled={action.disabled}
                    className="flex items-center cursor-pointer"
                  >
                    <action.icon className="w-4 h-4 mr-3" />
                    {action.label}
                    {action.disabled && (
                      <span className="ml-auto text-xs text-gray-400">Current</span>
                    )}
                  </DropdownMenuItem>
                ))}
            </>
          )}
          
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-gray-500">
            Keyboard shortcuts: Ctrl+1-3
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
