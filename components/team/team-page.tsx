"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Navigation } from '@/components/layout/navigation'
import { Users, Search, Mail, Phone, Globe } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  status: string
  photoUrl: string | null
  imdbProfile: string | null
  isProfileComplete: boolean
  createdAt: string
}

export function TeamPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/team')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch team members',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users.filter(user => user.status === 'ACTIVE')

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase()?.includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500'
      case 'EXECUTIVE': return 'bg-blue-500'
      case 'PRODUCER': return 'bg-purple-500'
      case 'READER': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'EXECUTIVE': return 'Executive/Manager'
      default: return role.charAt(0) + role.slice(1).toLowerCase()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team</h1>
          <p className="text-gray-600">Meet our talented team members</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="EXECUTIVE">Executive</SelectItem>
              <SelectItem value="PRODUCER">Producer</SelectItem>
              <SelectItem value="READER">Reader</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name || 'Team member'}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                      <Users className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl">
                  {user.name || 'No name provided'}
                </CardTitle>
                <Badge className={`${getRoleBadgeColor(user.role)} text-white mx-auto`}>
                  {getRoleDisplayName(user.role)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{user.email}</span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{user.phone}</span>
                  </div>
                )}
                
                {user.imdbProfile && (
                  <div className="flex items-center text-sm">
                    <Globe className="w-4 h-4 mr-2 text-gray-400" />
                    <a
                      href={user.imdbProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                    >
                      IMDB Profile
                    </a>
                  </div>
                )}
                
                {!user.isProfileComplete && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 w-full justify-center">
                    Profile Incomplete
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
            <p className="text-gray-500">
              {searchTerm || roleFilter !== 'ALL' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No active team members to display.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
