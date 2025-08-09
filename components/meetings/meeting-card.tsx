
"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { Meeting, MeetingStatus } from '@/lib/types'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  Users, 
  MoreVertical, 
  Edit,
  Trash2,
  ExternalLink,
  User,
  Video,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'

interface MeetingCardProps {
  meeting: Meeting
  onMeetingUpdated?: () => void
  onMeetingDeleted?: () => void
  showScript?: boolean
}

export function MeetingCard({ 
  meeting, 
  onMeetingUpdated, 
  onMeetingDeleted, 
  showScript = true 
}: MeetingCardProps) {
  const { data: session } = useSession()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)

  const isOrganizer = meeting.scheduledBy === session?.user?.id
  const isAdmin = session?.user?.role === 'ADMIN'
  const canEdit = isOrganizer || isAdmin
  const canDelete = isOrganizer || isAdmin

  const meetingDate = new Date(meeting.scheduledAt)
  const now = new Date()
  const isPast = meetingDate < now
  const isToday = meetingDate.toDateString() === now.toDateString()
  const isUpcoming = meetingDate > now

  const handleStatusChange = async (newStatus: MeetingStatus) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update meeting status')
      }

      toast({
        title: "Meeting Updated",
        description: `Meeting status changed to ${getStatusLabel(newStatus)}.`
      })

      onMeetingUpdated?.()
    } catch (error) {
      console.error('Error updating meeting:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update meeting status.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete meeting')
      }

      toast({
        title: "Meeting Deleted",
        description: `Meeting "${meeting.title}" has been deleted.`
      })

      onMeetingDeleted?.()
    } catch (error) {
      console.error('Error deleting meeting:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete meeting.",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: MeetingStatus) => {
    switch (status) {
      case 'SCHEDULED': return 'Scheduled'
      case 'IN_PROGRESS': return 'In Progress'
      case 'COMPLETED': return 'Completed'
      case 'CANCELLED': return 'Cancelled'
      default: return status
    }
  }

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const { date, time } = formatDateTime(meetingDate)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={`hover:shadow-md transition-all duration-200 ${
          isToday ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{meeting.title}</h3>
                  <Badge className={getStatusColor(meeting.status)}>
                    {getStatusLabel(meeting.status)}
                  </Badge>
                  {isToday && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      Today
                    </Badge>
                  )}
                </div>

                {/* Script Info */}
                {showScript && meeting.script && (
                  <Link 
                    href={`/scripts/${meeting.script.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mb-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {meeting.script.title}
                  </Link>
                )}

                {/* Date and Time */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span className={isToday ? 'font-medium text-blue-600' : ''}>{date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{time}</span>
                    {meeting.duration && (
                      <span className="text-gray-400">({meeting.duration}m)</span>
                    )}
                  </div>
                </div>

                {/* Location/Link */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {meeting.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{meeting.location}</span>
                    </div>
                  )}
                  {meeting.meetingLink && (
                    <div className="flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      <a 
                        href={meeting.meetingLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Menu */}
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={updating || deleting}>
                      {updating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MoreVertical className="w-4 h-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && meeting.status === 'SCHEDULED' && isUpcoming && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusChange('IN_PROGRESS')}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Start Meeting
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {canEdit && meeting.status === 'IN_PROGRESS' && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusChange('COMPLETED')}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {canEdit && meeting.status === 'SCHEDULED' && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusChange('CANCELLED')}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel Meeting
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {canDelete && (
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Meeting
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Description */}
            {meeting.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{meeting.description}</p>
            )}

            {/* Organizer and Participants */}
            <div className="space-y-3">
              {/* Organizer */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Organized by {meeting.organizer?.name || 'Unknown'}
                </span>
              </div>

              {/* Participants */}
              {meeting.participants && meeting.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-sm text-gray-600 mr-2">
                      {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}:
                    </span>
                    <div className="flex -space-x-2">
                      {meeting.participants.slice(0, 3).map((participant) => (
                        <Avatar 
                          key={participant.id} 
                          className="w-6 h-6 border-2 border-white"
                          title={participant.user?.name || participant.user?.email || 'Unknown'}
                        >
                          <AvatarImage src={participant.user?.photoUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {participant.user?.name?.charAt(0) || participant.user?.email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {meeting.participants.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-gray-600">+{meeting.participants.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the meeting "{meeting.title}"? This action cannot be undone and will notify all participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Meeting'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
