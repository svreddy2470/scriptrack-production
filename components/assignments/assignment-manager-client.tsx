
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AssignmentForm } from './assignment-form'
import { AssignmentCard } from './assignment-card'
import { AssignmentManager } from './assignment-manager'
import { Assignment, AssignmentStatus, AssignmentPriority } from '@/lib/types'
import { Search, Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface AssignmentManagerClientProps {
  mode: 'assigned-to' | 'assigned-by'
  userId: string
}

export function AssignmentManagerClient({ mode, userId }: AssignmentManagerClientProps) {
  // Use the existing AssignmentManager component
  // For 'assigned-to' mode: pass userId to show assignments assigned TO the user
  // For 'assigned-by' mode: use the enhanced AssignmentManager that supports assignedBy
  
  return (
    <EnhancedAssignmentManager 
      mode={mode}
      userId={userId}
      showHeader={true}
    />
  )
}

// Enhanced version of AssignmentManager that supports both modes
function EnhancedAssignmentManager({ 
  mode, 
  userId, 
  showHeader 
}: { 
  mode: 'assigned-to' | 'assigned-by'
  userId: string
  showHeader: boolean
}) {
  if (mode === 'assigned-to') {
    // Use existing AssignmentManager for assignments assigned TO the user
    return (
      <AssignmentManager 
        userId={userId}
        showHeader={showHeader}
      />
    )
  } else {
    // For 'assigned-by' mode, we need a custom implementation
    return (
      <AssignmentManagerForAssignedBy 
        userId={userId}
        showHeader={showHeader}
      />
    )
  }
}

// Custom component for showing assignments assigned BY the user
function AssignmentManagerForAssignedBy({ 
  userId, 
  showHeader 
}: { 
  userId: string
  showHeader: boolean
}) {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<AssignmentPriority | 'ALL'>('ALL')

  const canAssign = session?.user?.role === 'ADMIN' || session?.user?.role === 'EXECUTIVE' || session?.user?.role === 'READER'

  useEffect(() => {
    fetchAssignments()
  }, [userId])

  const fetchAssignments = async () => {
    try {
      const params = new URLSearchParams()
      params.append('assignedBy', userId)

      const response = await fetch(`/api/assignments?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch assignments')
      
      const data = await response.json()
      setAssignments(data)
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast({
        title: "Error",
        description: "Failed to fetch assignments. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (assignmentId: string, newStatus: AssignmentStatus) => {
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: newStatus }
          : assignment
      )
    )
  }

  const handleDelete = (assignmentId: string) => {
    setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId))
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = !searchTerm || 
      assignment.script?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.assignee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || assignment.status === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || assignment.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  // Group assignments by status
  const groupedAssignments = {
    PENDING: filteredAssignments.filter(a => a.status === 'PENDING'),
    IN_PROGRESS: filteredAssignments.filter(a => a.status === 'IN_PROGRESS'),
    COMPLETED: filteredAssignments.filter(a => a.status === 'COMPLETED'),
    OVERDUE: filteredAssignments.filter(a => 
      a.dueDate && 
      a.status !== 'COMPLETED' && 
      new Date(a.dueDate) < new Date()
    )
  }

  const stats = {
    total: assignments.length,
    pending: groupedAssignments.PENDING.length,
    inProgress: groupedAssignments.IN_PROGRESS.length,
    completed: groupedAssignments.COMPLETED.length,
    overdue: groupedAssignments.OVERDUE.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
            <p className="text-gray-600 mt-1">
              {stats.total} assignment{stats.total !== 1 ? 's' : ''} I've created
            </p>
          </div>
          {canAssign && (
            <AssignmentForm onAssignmentCreated={fetchAssignments} />
          )}
        </div>
      )}

      {/* Stats Overview */}
      {showHeader && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search assignments by script, assignee, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AssignmentStatus | 'ALL')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as AssignmentPriority | 'ALL')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignment Lists */}
      {['OVERDUE', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(status => {
        const statusAssignments = groupedAssignments[status as keyof typeof groupedAssignments]
        if (statusAssignments.length === 0) return null

        const statusLabels = {
          OVERDUE: 'Overdue Assignments',
          PENDING: 'Pending Assignments',
          IN_PROGRESS: 'In Progress',
          COMPLETED: 'Completed Assignments'
        }

        const statusColors = {
          OVERDUE: 'text-red-600',
          PENDING: 'text-yellow-600',
          IN_PROGRESS: 'text-blue-600', 
          COMPLETED: 'text-green-600'
        }

        return (
          <div key={status} className="space-y-4">
            <div className="flex items-center gap-2">
              {status === 'OVERDUE' && <AlertTriangle className="w-5 h-5 text-red-600" />}
              <h3 className={`text-lg font-semibold ${statusColors[status as keyof typeof statusColors]}`}>
                {statusLabels[status as keyof typeof statusLabels]}
              </h3>
              <Badge variant={status === 'OVERDUE' ? 'destructive' : 'secondary'}>
                {statusAssignments.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {statusAssignments.map((assignment) => (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <AssignmentCard
                      assignment={assignment}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      showScript={true}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {filteredAssignments.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filters.'
              : 'You haven\'t created any assignments yet.'
            }
          </p>
          {canAssign && (
            <AssignmentForm onAssignmentCreated={fetchAssignments} />
          )}
        </div>
      )}
    </div>
  )
}
