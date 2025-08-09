
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Download, 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Award, 
  AlertTriangle,
  BarChart3,
  User,
  Target,
  Activity
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

// Dynamic import for charts to avoid SSR issues
const Charts = dynamic(() => import('./admin-reports-charts'), { 
  ssr: false,
  loading: () => <div className="h-80 flex items-center justify-center">Loading charts...</div>
})

interface ReportData {
  users: UserActivity[]
  overview: OverviewStats  
  timelineData: TimelineData[]
  topPerformers: TopPerformer[]
  bottlenecks: Bottleneck[]
}

interface UserActivity {
  id: string
  name: string
  email: string
  role: string
  scriptsSubmitted: number
  tasksCompleted: number
  tasksAssigned: number
  feedbackGiven: number
  averageCompletionTime: number
  activityScore: number
  lastActive: string
}

interface OverviewStats {
  totalScripts: number
  totalAssignments: number
  completedAssignments: number
  pendingAssignments: number
  averageCompletionTime: number
  totalFeedback: number
}

interface TimelineData {
  date: string
  scripts: number
  assignments: number
  feedback: number
}

interface TopPerformer {
  id: string
  name: string
  role: string  
  score: number
  metric: string
}

interface Bottleneck {
  type: string
  description: string
  count: number
  severity: 'high' | 'medium' | 'low'
}

export function AdminReportsDashboard() {
  const { data: session } = useSession()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<string>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchReportData()
  }, [timePeriod, customStartDate, customEndDate])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('period', timePeriod)
      if (timePeriod === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate)
        params.append('endDate', customEndDate)
      }

      const response = await fetch(`/api/admin/reports?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch report data')
      
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch report data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.append('period', timePeriod)
      params.append('format', 'pdf')
      if (timePeriod === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate)
        params.append('endDate', customEndDate)
      }

      const response = await fetch(`/api/admin/reports/export?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to export report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `team-activity-report-${timePeriod}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Report Exported",
        description: "Team activity report has been downloaded successfully."
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'week': return 'Last 7 Days'
      case 'month': return 'Last 30 Days'
      case 'quarter': return 'Last 3 Months'
      case 'custom': return 'Custom Period'
      default: return 'Last 30 Days'
    }
  }

  const getCompletionRate = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-500'
      case 'EXECUTIVE': return 'bg-blue-500'
      case 'PRODUCER': return 'bg-green-500'
      case 'READER': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const chartColors = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#FF6363', '#80D8C3', '#A19AD3', '#72BF78']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Generating comprehensive reports...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data Available</h3>
        <p className="text-gray-600">Unable to generate reports at this time.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Period Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="period">Time Period</Label>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {timePeriod === 'custom' && (
              <>
                <div className="flex-1">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button onClick={exportReport} disabled={exporting} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              📋 <strong>Report Period:</strong> {getPeriodLabel()} 
              {timePeriod === 'custom' && customStartDate && customEndDate && 
                ` (${customStartDate} to ${customEndDate})`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Scripts</p>
                  <p className="text-3xl font-bold text-blue-600">{reportData.overview.totalScripts}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Assignments</p>
                  <p className="text-3xl font-bold text-orange-600">{reportData.overview.totalAssignments}</p>
                </div>
                <Target className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {getCompletionRate(reportData.overview.completedAssignments, reportData.overview.totalAssignments)}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
                  <p className="text-3xl font-bold text-purple-600">{reportData.overview.averageCompletionTime}d</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="users">👥 Team Performance</TabsTrigger>
          <TabsTrigger value="insights">💡 Quick Insights</TabsTrigger>
          <TabsTrigger value="trends">📈 Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Activity Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Charts type="timeline" data={reportData.timelineData} />
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Current Bottlenecks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.bottlenecks.map((bottleneck, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(bottleneck.severity)}`} />
                      <div>
                        <p className="font-medium text-gray-900">{bottleneck.description}</p>
                        <p className="text-sm text-gray-600">{bottleneck.type}</p>
                      </div>
                    </div>
                    <Badge variant={bottleneck.severity === 'high' ? 'destructive' : 'secondary'}>
                      {bottleneck.count} affected
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* User Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>👥 Individual Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{user.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getRoleColor(user.role)} text-white text-xs`}>
                              {user.role}
                            </Badge>
                            <span className="text-sm text-gray-500">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{user.activityScore}</div>
                        <div className="text-xs text-gray-500">Activity Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">{user.scriptsSubmitted}</div>
                        <div className="text-xs text-gray-600">Scripts Submitted</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">{user.tasksCompleted}</div>
                        <div className="text-xs text-gray-600">Tasks Completed</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-xl font-bold text-orange-600">{user.tasksAssigned}</div>
                        <div className="text-xs text-gray-600">Tasks Assigned</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-xl font-bold text-purple-600">{user.feedbackGiven}</div>
                        <div className="text-xs text-gray-600">Feedback Given</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                      <span>Avg. Completion Time: {user.averageCompletionTime} days</span>
                      <span>Last Active: {new Date(user.lastActive).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  🏆 Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.topPerformers.map((performer, index) => (
                    <div key={performer.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{performer.name}</p>
                          <p className="text-sm text-gray-600">{performer.metric}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-yellow-600">{performer.score}</div>
                        <Badge className={`${getRoleColor(performer.role)} text-white text-xs`}>
                          {performer.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  📊 Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Most Active Role</span>
                    <Badge className="bg-blue-500 text-white">PRODUCER</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Peak Activity Day</span>
                    <span className="font-semibold">Wednesday</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">Overall Productivity</span>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">Team Collaboration</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">On-Time Delivery</span>
                      <span className="text-sm font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Heatmap Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>🔥 Team Activity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }, (_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-sm ${
                      Math.random() > 0.7 ? 'bg-green-500' :
                      Math.random() > 0.4 ? 'bg-green-300' :
                      Math.random() > 0.2 ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                    title={`Day ${i + 1}: ${Math.floor(Math.random() * 10)} activities`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
                <span>Less active</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-gray-100 rounded-sm" />
                  <div className="w-3 h-3 bg-green-100 rounded-sm" />
                  <div className="w-3 h-3 bg-green-300 rounded-sm" />
                  <div className="w-3 h-3 bg-green-500 rounded-sm" />
                </div>
                <span>More active</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Team Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Team Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <Charts type="performance" data={reportData.users.slice(0, 8)} />
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>🎯 Role Distribution & Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Charts 
                type="roles" 
                data={[
                  { name: 'Admins', value: reportData.users.filter(u => u.role === 'ADMIN').length, color: '#A19AD3' },
                  { name: 'Executives', value: reportData.users.filter(u => u.role === 'EXECUTIVE').length, color: '#60B5FF' },
                  { name: 'Producers', value: reportData.users.filter(u => u.role === 'PRODUCER').length, color: '#72BF78' },
                  { name: 'Readers', value: reportData.users.filter(u => u.role === 'READER').length, color: '#FF9149' }
                ]} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
