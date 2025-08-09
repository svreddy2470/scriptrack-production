
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Activity as ActivityIcon, 
  User, 
  FileText, 
  Star, 
  MessageSquare, 
  UserCheck, 
  Edit, 
  Upload,
  Clock,
  Filter
} from 'lucide-react'
import { Activity, ActivityType } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface ActivityTimelineProps {
  scriptId?: string
  userId?: string
  limit?: number
  showHeader?: boolean
}

export function ActivityTimeline({ scriptId, userId, limit = 50, showHeader = true }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'ALL'>('ALL')
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('7days')
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchActivities()
  }, [scriptId, userId, limit, dateRange])

  const fetchActivities = async (append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      }
      
      const params = new URLSearchParams()
      if (scriptId) params.append('scriptId', scriptId)
      if (userId) params.append('userId', userId)
      
      // Calculate date filter
      const now = new Date()
      let dateFrom: Date | null = null
      
      if (dateRange === '7days') {
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (dateRange === '30days') {
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
      
      if (dateFrom) {
        params.append('dateFrom', dateFrom.toISOString())
      }
      
      const currentLimit = append ? activities.length + limit : limit
      params.append('limit', currentLimit.toString())

      const response = await fetch(`/api/activities?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch activities')
      
      const data = await response.json()
      const newActivities = Array.isArray(data) ? data : data.activities || []
      
      if (append) {
        setActivities(newActivities)
      } else {
        setActivities(newActivities)
      }
      
      // Check if there are more activities to load
      setHasMore(newActivities.length >= currentLimit)
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast({
        title: "Error",
        description: "Failed to fetch activity history.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreActivities = () => {
    fetchActivities(true)
  }

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'SCRIPT_SUBMITTED': return <FileText className="w-4 h-4" />
      case 'STATUS_CHANGED': return <ActivityIcon className="w-4 h-4" />
      case 'ASSIGNMENT_CREATED': return <UserCheck className="w-4 h-4" />
      case 'ASSIGNMENT_COMPLETED': return <UserCheck className="w-4 h-4" />
      case 'FEEDBACK_ADDED': return <MessageSquare className="w-4 h-4" />
      case 'FILE_UPLOADED': return <Upload className="w-4 h-4" />
      case 'SCRIPT_FEATURED': return <Star className="w-4 h-4" />
      case 'SCRIPT_EDITED': return <Edit className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'SCRIPT_SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'STATUS_CHANGED': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'ASSIGNMENT_CREATED': return 'bg-green-100 text-green-800 border-green-200'
      case 'ASSIGNMENT_COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'FEEDBACK_ADDED': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'FILE_UPLOADED': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'SCRIPT_FEATURED': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'SCRIPT_EDITED': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActivityTypeLabel = (type: ActivityType) => {
    switch (type) {
      case 'SCRIPT_SUBMITTED': return 'Submitted'
      case 'STATUS_CHANGED': return 'Status Change'
      case 'ASSIGNMENT_CREATED': return 'Assignment'
      case 'ASSIGNMENT_COMPLETED': return 'Assignment Complete'
      case 'FEEDBACK_ADDED': return 'Feedback'
      case 'FILE_UPLOADED': return 'File Upload'
      case 'SCRIPT_FEATURED': return 'Featured'
      case 'SCRIPT_EDITED': return 'Edited'
      default: return type
    }
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredActivities = activities.filter(activity => 
    typeFilter === 'ALL' || activity.type === typeFilter
  )

  const groupedActivities = groupActivitiesByDate(filteredActivities)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading activity history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Activity Timeline
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {filteredActivities.length} activit{filteredActivities.length !== 1 ? 'ies' : 'y'}
              {dateRange === '7days' && ' in the last 7 days'}
              {dateRange === '30days' && ' in the last 30 days'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as '7days' | '30days' | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ActivityType | 'ALL')}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Activities</SelectItem>
                <SelectItem value="SCRIPT_SUBMITTED">Submissions</SelectItem>
                <SelectItem value="STATUS_CHANGED">Status Changes</SelectItem>
                <SelectItem value="ASSIGNMENT_CREATED">Assignments</SelectItem>
                <SelectItem value="FEEDBACK_ADDED">Feedback</SelectItem>
                <SelectItem value="FILE_UPLOADED">File Uploads</SelectItem>
                <SelectItem value="SCRIPT_FEATURED">Featured</SelectItem>
                <SelectItem value="SCRIPT_EDITED">Edits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        <AnimatePresence>
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <Badge variant="outline" className="text-xs px-3 py-1">
                  {date}
                </Badge>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Activities for this date */}
              <div className="space-y-3">
                {dateActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-8"
                  >
                    {/* Timeline line */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" />
                    
                    {/* Activity dot */}
                    <div className={`absolute left-0 top-2 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center transform -translate-x-1/2 ${
                      getActivityColor(activity.type).replace('text-', 'bg-').replace('-800', '-500')
                    }`}>
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Activity card */}
                    <Card className="ml-4 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${getActivityColor(activity.type)} border text-xs`}>
                                {getActivityTypeLabel(activity.type)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(activity.createdAt)}
                              </span>
                            </div>
                            
                            <h4 className="font-medium text-gray-900 mb-1">
                              {activity.title}
                            </h4>
                            
                            {activity.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {activity.description}
                              </p>
                            )}

                            {/* Script info (if not showing for specific script) */}
                            {!scriptId && (
                              <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 inline-block">
                                {activity.script ? (
                                  <>Script: {activity.script.title}</>
                                ) : (
                                  <span className="text-red-500">Script: [Deleted]</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* User avatar */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {activity.user?.photoUrl ? (
                                <Image
                                  src={activity.user.photoUrl}
                                  alt={activity.user.name || ''}
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              {activity.user?.name}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {hasMore && dateRange === 'all' && filteredActivities.length > 0 && (
        <div className="text-center py-6">
          <Button
            variant="outline"
            onClick={loadMoreActivities}
            disabled={loadingMore}
            className="flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Loading more...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Load More Activities
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredActivities.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
          <p className="text-gray-600">
            {typeFilter !== 'ALL' 
              ? `No ${getActivityTypeLabel(typeFilter).toLowerCase()} activities found.`
              : dateRange !== 'all'
                ? `No activity in the selected time range.`
                : scriptId 
                  ? 'No activity recorded for this script yet.'
                  : 'No activity recorded yet.'
            }
          </p>
          {dateRange !== 'all' && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDateRange('all')}
            >
              View All Activity
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to group activities by date
function groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
  const grouped: Record<string, Activity[]> = {}
  
  activities.forEach(activity => {
    const date = new Date(activity.createdAt)
    const dateKey = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    })
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(activity)
  })
  
  return grouped
}
