
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MeetingForm } from './meeting-form'
import { MeetingCard } from './meeting-card'
import { Meeting, MeetingStatus } from '@/lib/types'
import { Search, Plus, Filter, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface MeetingManagerProps {
  scriptId?: string
  userId?: string
  showHeader?: boolean
  readOnly?: boolean
}

export function MeetingManager({ scriptId, userId, showHeader = true, readOnly = false }: MeetingManagerProps) {
  const { data: session, status } = useSession()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'ALL'>('ALL')
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('ALL')

  // Wait for session to load before determining permissions
  const isSessionLoading = status === 'loading'
  const canSchedule = !isSessionLoading && 
    (session?.user?.role === 'ADMIN' || 
     session?.user?.role === 'EXECUTIVE' || 
     session?.user?.role === 'PRODUCER') && !readOnly

  useEffect(() => {
    fetchMeetings()
  }, [scriptId, userId])

  const fetchMeetings = async () => {
    try {
      const params = new URLSearchParams()
      if (scriptId) params.append('scriptId', scriptId)
      if (userId) params.append('userId', userId)

      const response = await fetch(`/api/meetings?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch meetings')
      
      const data = await response.json()
      setMeetings(data)
    } catch (error) {
      console.error('Error fetching meetings:', error)
      toast({
        title: "Error",
        description: "Failed to fetch meetings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMeetingUpdate = () => {
    fetchMeetings()
  }

  const handleMeetingDelete = (meetingId: string) => {
    setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId))
  }

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !searchTerm || 
      meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.organizer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.script?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || meeting.status === statusFilter
    
    let matchesTime = true
    if (timeFilter === 'UPCOMING') {
      matchesTime = new Date(meeting.scheduledAt) > new Date() && 
                   ['SCHEDULED', 'IN_PROGRESS'].includes(meeting.status)
    } else if (timeFilter === 'PAST') {
      matchesTime = new Date(meeting.scheduledAt) < new Date() || 
                   ['COMPLETED', 'CANCELLED'].includes(meeting.status)
    }
    
    return matchesSearch && matchesStatus && matchesTime
  })

  // Group meetings by status and time
  const now = new Date()
  const groupedMeetings = {
    TODAY: filteredMeetings.filter(m => {
      const meetingDate = new Date(m.scheduledAt)
      return meetingDate.toDateString() === now.toDateString() && 
             ['SCHEDULED', 'IN_PROGRESS'].includes(m.status)
    }),
    UPCOMING: filteredMeetings.filter(m => {
      const meetingDate = new Date(m.scheduledAt)
      return meetingDate > now && 
             meetingDate.toDateString() !== now.toDateString() &&
             ['SCHEDULED', 'IN_PROGRESS'].includes(m.status)
    }),
    COMPLETED: filteredMeetings.filter(m => m.status === 'COMPLETED'),
    CANCELLED: filteredMeetings.filter(m => m.status === 'CANCELLED')
  }

  const stats = {
    total: meetings.length,
    scheduled: meetings.filter(m => m.status === 'SCHEDULED').length,
    inProgress: meetings.filter(m => m.status === 'IN_PROGRESS').length,
    completed: meetings.filter(m => m.status === 'COMPLETED').length,
    today: groupedMeetings.TODAY.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading meetings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {scriptId ? 'Script Meetings' : userId ? 'My Meetings' : 'All Meetings'}
            </h2>
            <p className="text-gray-600 mt-1">
              {stats.total} meeting{stats.total !== 1 ? 's' : ''} total
              {stats.today > 0 && (
                <span className="text-blue-600 font-medium"> • {stats.today} today</span>
              )}
            </p>
          </div>
          {canSchedule && (
            <MeetingForm 
              scriptId={scriptId}
              onMeetingCreated={fetchMeetings}
            />
          )}
        </div>
      )}

      {/* Always show meeting form for management users when they can schedule, even without header */}
      {!showHeader && canSchedule && (
        <div className="mb-6 flex justify-end">
          <MeetingForm 
            scriptId={scriptId}
            onMeetingCreated={fetchMeetings}
            trigger={
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Schedule Meeting
              </Button>
            }
          />
        </div>
      )}

      {/* Stats Overview */}
      {showHeader && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.scheduled}</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats.inProgress}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-gray-500" />
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
            placeholder="Search meetings by title, description, or organizer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MeetingStatus | 'ALL')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as 'ALL' | 'UPCOMING' | 'PAST')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Time</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="PAST">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Today's Meetings */}
      {groupedMeetings.TODAY.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Today's Meetings</h3>
            <Badge className="bg-blue-100 text-blue-800">{groupedMeetings.TODAY.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {groupedMeetings.TODAY.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <MeetingCard
                    meeting={meeting}
                    onMeetingUpdated={handleMeetingUpdate}
                    onMeetingDeleted={() => handleMeetingDelete(meeting.id)}
                    showScript={!scriptId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upcoming Meetings */}
      {groupedMeetings.UPCOMING.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-900">Upcoming Meetings</h3>
            <Badge variant="secondary">{groupedMeetings.UPCOMING.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {groupedMeetings.UPCOMING.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <MeetingCard
                    meeting={meeting}
                    onMeetingUpdated={handleMeetingUpdate}
                    onMeetingDeleted={() => handleMeetingDelete(meeting.id)}
                    showScript={!scriptId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Completed Meetings */}
      {groupedMeetings.COMPLETED.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">Completed Meetings</h3>
            <Badge variant="secondary">{groupedMeetings.COMPLETED.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {groupedMeetings.COMPLETED.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <MeetingCard
                    meeting={meeting}
                    onMeetingUpdated={handleMeetingUpdate}
                    onMeetingDeleted={() => handleMeetingDelete(meeting.id)}
                    showScript={!scriptId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Cancelled Meetings */}
      {groupedMeetings.CANCELLED.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Cancelled Meetings</h3>
            <Badge variant="destructive">{groupedMeetings.CANCELLED.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {groupedMeetings.CANCELLED.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <MeetingCard
                    meeting={meeting}
                    onMeetingUpdated={handleMeetingUpdate}
                    onMeetingDeleted={() => handleMeetingDelete(meeting.id)}
                    showScript={!scriptId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredMeetings.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'ALL' || timeFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filters.'
              : scriptId 
                ? 'No meetings have been scheduled for this script yet.'
                : 'No meetings have been scheduled yet.'
            }
          </p>
          {canSchedule && !scriptId && (
            <MeetingForm onMeetingCreated={fetchMeetings} />
          )}
        </div>
      )}
    </div>
  )
}
