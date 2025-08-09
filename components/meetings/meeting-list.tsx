
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Meeting } from '@/lib/types'
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  MapPin, 
  Video, 
  User,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from '@/hooks/use-toast'

interface MeetingListProps {
  limit?: number
  showHeader?: boolean
  userId?: string
  upcoming?: boolean
}

export function MeetingList({ 
  limit = 5, 
  showHeader = true, 
  userId,
  upcoming = true 
}: MeetingListProps) {
  const { data: session } = useSession()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchMeetings()
    }
  }, [session?.user?.id, userId, upcoming, limit])

  const fetchMeetings = async () => {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (upcoming) params.append('upcoming', 'true')

      const response = await fetch(`/api/meetings?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch meetings')
      
      const data = await response.json()
      setMeetings(data.slice(0, limit))
    } catch (error) {
      console.error('Error fetching meetings:', error)
      toast({
        title: "Error",
        description: "Failed to fetch meetings.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const isToday = dateObj.toDateString() === now.toDateString()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isTomorrow = dateObj.toDateString() === tomorrow.toDateString()

    const timeStr = dateObj.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    })

    if (isToday) return `Today at ${timeStr}`
    if (isTomorrow) return `Tomorrow at ${timeStr}`
    
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string, scheduledAt: Date | string) => {
    const now = new Date()
    const meetingDate = new Date(scheduledAt)
    const isToday = meetingDate.toDateString() === now.toDateString()

    switch (status) {
      case 'SCHEDULED': 
        return isToday ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-600'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          {showHeader && (
            <CardTitle className="flex items-center text-lg font-semibold">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              📅 {upcoming ? 'Upcoming Meetings' : 'Recent Meetings'}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        {showHeader && (
          <>
            <CardTitle className="flex items-center text-lg font-semibold">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              📅 {upcoming ? 'Upcoming Meetings' : 'Recent Meetings'}
            </CardTitle>
            <Link href="/meetings">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                View All
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </>
        )}
      </CardHeader>
      <CardContent>
        {meetings.length > 0 ? (
          <div className="space-y-3">
            {meetings.map((meeting, index) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    {/* Meeting Title and Script Link */}
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {meeting.title}
                      </h4>
                      <Badge className={getStatusColor(meeting.status, meeting.scheduledAt)}>
                        {meeting.status === 'SCHEDULED' && 
                         new Date(meeting.scheduledAt).toDateString() === new Date().toDateString() 
                         ? 'Today' 
                         : meeting.status.charAt(0) + meeting.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>

                    {/* Script Info */}
                    {meeting.script && (
                      <Link 
                        href={`/scripts/${meeting.script.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mb-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {meeting.script.title}
                      </Link>
                    )}

                    {/* Date and Time */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTime(meeting.scheduledAt)}</span>
                      </div>
                      {meeting.duration && (
                        <span>({meeting.duration}m)</span>
                      )}
                    </div>

                    {/* Location/Link and Organizer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {meeting.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-20">{meeting.location}</span>
                          </div>
                        )}
                        {meeting.meetingLink && (
                          <div className="flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            <a 
                              href={meeting.meetingLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Join
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Organizer */}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{meeting.organizer?.name || 'Unknown'}</span>
                      </div>
                    </div>

                    {/* Participants */}
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-1">
                          {meeting.participants.slice(0, 3).map((participant) => (
                            <Avatar 
                              key={participant.id} 
                              className="w-4 h-4 border border-white"
                              title={participant.user?.name || participant.user?.email || 'Unknown'}
                            >
                              <AvatarImage src={participant.user?.photoUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {participant.user?.name?.charAt(0) || participant.user?.email?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.participants.length > 3 && (
                            <div className="w-4 h-4 rounded-full bg-gray-200 border border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{meeting.participants.length - 3}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {upcoming ? 'No upcoming meetings' : 'No recent meetings'}
            </p>
            <p className="text-xs mt-1">
              {upcoming 
                ? 'Scheduled meetings will appear here'
                : 'Past meetings will appear here'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
