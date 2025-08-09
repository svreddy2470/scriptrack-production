"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnhancedLayout } from '@/components/layout/enhanced-layout'
import { DashboardStats } from './dashboard-stats'
import { MeetingList } from '@/components/meetings/meeting-list'
import { User, Users, Settings, BookOpen, FileText, Clock, UserCheck, ArrowRight, Eye, CheckCircle, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

interface Script {
  id: string
  title: string
  status: string
  submittedAt: string
  writers: string
}

interface Assignment {
  id: string
  script: {
    id: string
    title: string
    writers: string
  }
  status: string
  priority: string
  dueDate?: string
  assignedAt: string
  assignee?: {
    id: string
    name: string
    email: string
    role: string
  }
  assigner?: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function UserDashboard() {
  const { data: session } = useSession()
  const [mySubmissions, setMySubmissions] = useState<Script[]>([])
  const [myTasks, setMyTasks] = useState<Assignment[]>([])
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session?.user?.id])

  const fetchDashboardData = async () => {
    if (!session?.user?.id) return

    try {
      // Fetch My Submissions (scripts I've submitted)
      const submissionsResponse = await fetch(`/api/scripts?userId=${session.user.id}&limit=3`)
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json()
        // API now returns paginated data with scripts array
        setMySubmissions(submissionsData?.scripts ? submissionsData.scripts.slice(0, 3) : [])
      }

      // Fetch My Tasks (scripts assigned TO me)  
      const tasksResponse = await fetch(`/api/assignments?assignedTo=${session.user.id}`)
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        // API returns array directly, not wrapped in object
        setMyTasks(Array.isArray(tasksData) ? tasksData.slice(0, 3) : [])
      }

      // Fetch My Assignments (scripts I've assigned TO others)
      const assignmentsResponse = await fetch(`/api/assignments?assignedBy=${session.user.id}`)
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        // API returns array directly, not wrapped in object  
        setMyAssignments(Array.isArray(assignmentsData) ? assignmentsData.slice(0, 3) : [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'EXECUTIVE': return 'bg-blue-500'
      case 'PRODUCER': return 'bg-purple-500'
      case 'READER': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'EXECUTIVE': return 'Executive/Manager'
      default: return role?.charAt(0) + role?.slice(1).toLowerCase()
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'EXECUTIVE':
        return 'You have executive access to manage scripts and coordinate with the team.'
      case 'PRODUCER':
        return 'You can review scripts, provide feedback, and manage production workflows.'
      case 'READER':
        return 'You can read assigned scripts and provide detailed feedback and analysis.'
      default:
        return 'Welcome to ScripTrack! Your role gives you access to script management features.'
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A'
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'N/A'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED': return 'default'
      case 'READING': return 'secondary'
      case 'CONSIDERED': return 'outline'
      case 'GREENLIT': return 'default'
      case 'PENDING': return 'secondary'
      case 'IN_PROGRESS': return 'default'
      case 'COMPLETED': return 'default'
      default: return 'secondary'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH': return 'text-red-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'LOW': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <EnhancedLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session?.user?.name || 'User'}!
          </h1>
          <p className="text-gray-600">Here's your ScripTrack dashboard overview</p>
        </div>

        {/* Priority Section: My Work (Most Important) */}
        <div className="mb-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-blue-600" />
              My Work Dashboard
            </h2>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRoleBadgeColor(session?.user?.role || '')} text-white`}>
                {getRoleDisplayName(session?.user?.role || '')}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* My Submissions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    📝 My Submissions
                  </CardTitle>
                  <Link href={`/scripts?userId=${session?.user?.id}`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      View All
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Scripts I've submitted</p>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse" />
                      ))}
                    </div>
                  ) : mySubmissions?.length > 0 ? (
                    <div className="space-y-3">
                      {mySubmissions.map((script) => (
                        <div key={script.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <Link href={`/scripts/${script.id}`} className="font-medium text-sm hover:text-blue-600 line-clamp-1">
                                {script.title}
                              </Link>
                              <p className="text-xs text-gray-500 mt-1">by {script.writers}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={getStatusBadgeVariant(script.status)} className="text-xs">
                                  {script.status?.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  {formatDate(script.submittedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No submissions yet</p>
                      <Link href="/scripts/submit">
                        <Button variant="outline" size="sm" className="mt-2">
                          Submit Your First Script
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* My Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Clock className="w-5 h-5 mr-2 text-orange-600" />
                    ⚡ My Tasks
                  </CardTitle>
                  <Link href="/assignments">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      View All
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Scripts assigned to me</p>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse" />
                      ))}
                    </div>
                  ) : myTasks?.length > 0 ? (
                    <div className="space-y-3">
                      {myTasks.map((task) => (
                        <div key={task.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <Link href={`/scripts/${task.script?.id}`} className="font-medium text-sm hover:text-blue-600 line-clamp-1">
                                {task.script?.title}
                              </Link>
                              <p className="text-xs text-gray-500 mt-1">by {task.script?.writers}</p>
                              <p className="text-xs text-blue-600 mt-1">
                                Assigned by: {task.assigner?.name || 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
                                  {task.status?.replace('_', ' ')}
                                </Badge>
                                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority} Priority
                                </span>
                              </div>
                              {task.dueDate && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Due: {formatDate(task.dueDate)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No pending tasks</p>
                      <p className="text-xs mt-1">Tasks will appear here when assigned to you</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* My Assignments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <UserCheck className="w-5 h-5 mr-2 text-green-600" />
                    👥 My Assignments
                  </CardTitle>
                  <Link href={`/assignments?assignedBy=${session?.user?.id}`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      View All
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Scripts I've assigned to others</p>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse" />
                      ))}
                    </div>
                  ) : myAssignments?.length > 0 ? (
                    <div className="space-y-3">
                      {myAssignments.map((assignment) => (
                        <div key={assignment.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <Link href={`/scripts/${assignment.script?.id}`} className="font-medium text-sm hover:text-blue-600 line-clamp-1">
                                {assignment.script?.title}
                              </Link>
                              <p className="text-xs text-gray-500 mt-1">by {assignment.script?.writers}</p>
                              <p className="text-xs text-green-600 mt-1">
                                Assigned to: {assignment.assignee?.name || 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={getStatusBadgeVariant(assignment.status)} className="text-xs">
                                  {assignment.status?.replace('_', ' ')}
                                </Badge>
                                <span className={`text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                                  {assignment.priority} Priority
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                Assigned: {formatDate(assignment.assignedAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No assignments yet</p>
                      <p className="text-xs mt-1">Assignments you create will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* My Meetings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <MeetingList 
                limit={3}
                showHeader={true}
                upcoming={true}
              />
            </motion.div>
          </div>
        </div>

        {/* Movie-themed Status Cards */}
        <DashboardStats />

        {/* Compact Quick Actions */}
        <div className="mt-8">
          <Card className="bg-gradient-to-r from-gray-50 to-blue-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Settings className="w-5 h-5 mr-2 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link 
                  href="/team"
                  className="flex items-center justify-center text-sm text-gray-600 hover:text-blue-600 hover:bg-white p-3 rounded-lg transition-all cursor-pointer group border border-transparent hover:border-blue-200 hover:shadow-sm"
                >
                  <Users className="w-4 h-4 mr-2 group-hover:text-blue-600" />
                  <span>View Team</span>
                </Link>
                <Link 
                  href="/profile"
                  className="flex items-center justify-center text-sm text-gray-600 hover:text-blue-600 hover:bg-white p-3 rounded-lg transition-all cursor-pointer group border border-transparent hover:border-blue-200 hover:shadow-sm"
                >
                  <User className="w-4 h-4 mr-2 group-hover:text-blue-600" />
                  <span>Update Profile</span>
                </Link>
                <Link 
                  href="/scripts"
                  className="flex items-center justify-center text-sm text-gray-600 hover:text-blue-600 hover:bg-white p-3 rounded-lg transition-all cursor-pointer group border border-transparent hover:border-blue-200 hover:shadow-sm"
                >
                  <BookOpen className="w-4 h-4 mr-2 group-hover:text-blue-600" />
                  <span>Browse Scripts</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </EnhancedLayout>
  )
}
