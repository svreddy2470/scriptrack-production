
"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar, 
  User, 
  Clock, 
  Flag, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Film,
  Tv
} from 'lucide-react'
import { Assignment, AssignmentStatus } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'

interface AssignmentCardProps {
  assignment: Assignment
  onStatusChange?: (assignmentId: string, newStatus: AssignmentStatus) => void
  onDelete?: (assignmentId: string) => void
  showScript?: boolean
}

export function AssignmentCard({ assignment, onStatusChange, onDelete, showScript = true }: AssignmentCardProps) {
  const { data: session } = useSession()
  const [updating, setUpdating] = useState(false)

  const isAssignee = assignment.assignedTo === session?.user?.id
  const isAssigner = assignment.assignedBy === session?.user?.id
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'EXECUTIVE'
  const canUpdateStatus = isAssignee || canManage
  const canDelete = canManage

  const getStatusColor = (status: AssignmentStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200'
      case 'OVERDUE': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: AssignmentStatus) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-3 h-3" />
      case 'IN_PROGRESS': return <AlertCircle className="w-3 h-3" />
      case 'COMPLETED': return <CheckCircle className="w-3 h-3" />
      case 'OVERDUE': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-blue-600'
      case 'LOW': return 'text-gray-600'
      default: return 'text-blue-600'
    }
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = assignment.dueDate && assignment.status !== 'COMPLETED' && new Date(assignment.dueDate) < new Date()

  const handleStatusChange = async (newStatus: AssignmentStatus) => {
    if (!canUpdateStatus) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')

      toast({
        title: "Status Updated",
        description: `Assignment status changed to ${newStatus.toLowerCase().replace('_', ' ')}.`
      })

      onStatusChange?.(assignment.id, newStatus)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignment status.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete) return

    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete assignment')

      toast({
        title: "Assignment Deleted",
        description: "Assignment has been successfully deleted."
      })

      onDelete?.(assignment.id)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment.",
        variant: "destructive"
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 bg-white ${
        isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(isOverdue && assignment.status !== 'COMPLETED' ? 'OVERDUE' : assignment.status)} border font-medium flex items-center gap-1`}>
                {getStatusIcon(isOverdue && assignment.status !== 'COMPLETED' ? 'OVERDUE' : assignment.status)}
                {isOverdue && assignment.status !== 'COMPLETED' ? 'Overdue' :
                 assignment.status === 'PENDING' ? 'Pending' :
                 assignment.status === 'IN_PROGRESS' ? 'In Progress' :
                 assignment.status === 'COMPLETED' ? 'Completed' :
                 assignment.status}
              </Badge>
              <Badge variant="outline" className={`${getPriorityColor(assignment.priority)} border-current`}>
                <Flag className="w-3 h-3 mr-1" />
                {assignment.priority.toLowerCase()}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {assignment.script ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/scripts/${assignment.scriptId}`} className="flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      View Script
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="flex items-center text-gray-400">
                    <Eye className="w-4 h-4 mr-2" />
                    Script Unavailable
                  </DropdownMenuItem>
                )}
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Assignment
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Script Info */}
          {showScript && (
            <div className="flex gap-3">
              <div className="w-12 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded overflow-hidden flex-shrink-0">
                {assignment.script?.coverImageUrl ? (
                  <Image
                    src={assignment.script.coverImageUrl}
                    alt={assignment.script?.title || 'Script cover'}
                    width={48}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {assignment.script?.type === 'FEATURE_FILM' ? (
                      <Film className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Tv className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {assignment.script ? (
                  <>
                    <Link href={`/scripts/${assignment.scriptId}`}>
                      <h4 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                        {assignment.script.title}
                      </h4>
                    </Link>
                    <p className="text-sm text-gray-600">By {assignment.script.writers}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{assignment.script.logline}</p>
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-red-600 text-sm">Script Deleted</h4>
                      <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                    </div>
                    <p className="text-xs text-gray-500">This script is no longer available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Details */}
          <div className="space-y-3">
            {/* Assignee */}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Assigned to:</span>
              <div className="flex items-center gap-2">
                {assignment.assignee?.photoUrl ? (
                  <Image
                    src={assignment.assignee.photoUrl}
                    alt={assignment.assignee.name || ''}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-gray-500" />
                  </div>
                )}
                <span className="font-medium">{assignment.assignee?.name}</span>
              </div>
            </div>

            {/* Due Date */}
            {assignment.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Due:</span>
                <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(assignment.dueDate)}
                  {isOverdue && <span className="ml-1">(Overdue)</span>}
                </span>
              </div>
            )}

            {/* Notes */}
            {assignment.notes && (
              <div className="text-sm">
                <p className="text-gray-600 mb-1">Notes:</p>
                <p className="text-gray-800 bg-gray-50 p-2 rounded text-xs">{assignment.notes}</p>
              </div>
            )}

            {/* Feedback Count */}
            {assignment.feedback && assignment.feedback.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4" />
                <span>{assignment.feedback.length} feedback{assignment.feedback.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Status Update */}
          {canUpdateStatus && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Select
                  value={assignment.status}
                  onValueChange={handleStatusChange}
                  disabled={updating}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Assignment Info */}
          <div className="text-xs text-gray-500 pt-2">
            Created {formatDate(assignment.createdAt)} by {assignment.assigner?.name}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
