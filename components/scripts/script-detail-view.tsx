
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Star, 
  StarOff,
  FileText, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Film, 
  Tv,
  DollarSign,
  Eye,
  Loader2,
  UserCheck,
  MessageSquare,
  Clock,
  Plus,
  Trash2,
  Upload
} from 'lucide-react'
import { Script, ScriptStatus } from '@/lib/types'
import { AssignmentForm } from '@/components/assignments/assignment-form'
import { AssignmentManager } from '@/components/assignments/assignment-manager'
import { FeedbackForm } from '@/components/feedback/feedback-form'
import { ScriptFeedbackList } from '@/components/feedback/script-feedback-list'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { MeetingManager } from '@/components/meetings/meeting-manager'
import { motion } from 'framer-motion'

interface ScriptDetailViewProps {
  scriptId: string
}

export function ScriptDetailView({ scriptId }: ScriptDetailViewProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [script, setScript] = useState<Script | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [notes, setNotes] = useState('')
  const [readingProgress, setReadingProgress] = useState(0)

  // Wait for session to load before determining permissions
  const isSessionLoading = status === 'loading'
  
  // Define sophisticated permission levels
  const isOwner = !isSessionLoading && script?.submittedBy === session?.user?.id
  const isAdmin = !isSessionLoading && session?.user?.role === 'ADMIN'
  const isExecutive = !isSessionLoading && session?.user?.role === 'EXECUTIVE'
  const isProducer = !isSessionLoading && session?.user?.role === 'PRODUCER'
  const isReader = !isSessionLoading && session?.user?.role === 'READER'
  
  // Content editing permissions: Owners can edit their own scripts
  const canEditContent = !isSessionLoading && (isOwner || isAdmin || isExecutive)
  
  // Management permissions: Only Admins and Executives can manage workflow
  const canManage = !isSessionLoading && (isAdmin || isExecutive)
  
  // Assignment permissions: Admins, Executives, and Readers can create assignments
  const canAssign = !isSessionLoading && (isAdmin || isExecutive || isReader)
  
  // Legacy compatibility - overall edit permission
  const canEdit = canEditContent

  useEffect(() => {
    fetchScript()
  }, [scriptId])

  const fetchScript = async () => {
    try {
      const response = await fetch(`/api/scripts/${scriptId}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/scripts')
          return
        }
        throw new Error('Failed to fetch script')
      }
      
      const data = await response.json()
      setScript(data)
      setNotes(data.notes || '')
      setReadingProgress(data.readingProgress || 0)
    } catch (error) {
      console.error('Error fetching script:', error)
      toast({
        title: "Error",
        description: "Failed to load script details.",
        variant: "destructive"
      })
      router.push('/scripts')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: ScriptStatus) => {
    if (!script) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')

      const updatedScript = await response.json()
      setScript(updatedScript)

      toast({
        title: "Status updated",
        description: `Script status changed to ${getStatusLabel(newStatus)}.`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update script status.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleFeatureToggle = async () => {
    if (!script) return

    setUpdating(true)
    try {
      const response = await fetch('/api/scripts/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, featured: !script.isFeatured })
      })

      if (!response.ok) throw new Error('Failed to toggle featured status')

      const updatedScript = { ...script, isFeatured: !script.isFeatured }
      setScript(updatedScript)

      toast({
        title: script.isFeatured ? "Removed from featured" : "Script featured",
        description: script.isFeatured ? "Script removed from featured." : "Script has been marked as featured."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update featured status.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleNotesUpdate = async () => {
    if (!script) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })

      if (!response.ok) throw new Error('Failed to update notes')

      toast({
        title: "Notes updated",
        description: "Script notes have been updated."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notes.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleProgressUpdate = async () => {
    if (!script) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingProgress })
      })

      if (!response.ok) throw new Error('Failed to update progress')

      toast({
        title: "Progress updated",
        description: `Reading progress set to ${readingProgress}%.`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reading progress.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!script) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete script')
      }

      toast({
        title: "Script deleted",
        description: `"${script.title}" has been deleted successfully.`
      })

      // Navigate back to scripts list
      router.push('/scripts')
    } catch (error) {
      console.error('Error deleting script:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete script.",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleFileDelete = async (fileType: string, fileId: string) => {
    if (!script) return

    setUpdating(true)
    try {
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileType,
          fileId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete file')
      }

      const result = await response.json()
      
      // Show success message
      toast({
        title: "File deleted",
        description: result.message || "File has been deleted successfully.",
      })

      // Refresh script data to reflect the deletion
      await fetchScript()
      
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete file.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'READING': return 'bg-yellow-100 text-yellow-800'
      case 'CONSIDERED': return 'bg-purple-100 text-purple-800'
      case 'DEVELOPMENT': return 'bg-indigo-100 text-indigo-800'
      case 'GREENLIT': return 'bg-green-100 text-green-800'
      case 'IN_PRODUCTION': return 'bg-emerald-100 text-emerald-800'
      case 'ON_HOLD': return 'bg-orange-100 text-orange-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'Submitted'
      case 'READING': return 'Reading'
      case 'CONSIDERED': return 'Considered'
      case 'DEVELOPMENT': return 'Development'
      case 'GREENLIT': return 'Greenlit'
      case 'IN_PRODUCTION': return 'In Production'
      case 'ON_HOLD': return 'On Hold'
      case 'REJECTED': return 'Rejected'
      default: return status
    }
  }

  const getBudgetLabel = (budgetRange: string) => {
    switch (budgetRange) {
      case 'INDIE': return 'Indie (Below ₹1 Cr)'
      case 'LOW': return 'Low (₹1-3 Cr)'
      case 'MEDIUM': return 'Medium (₹3-6 Cr)'
      case 'HIGH': return 'High (₹7-10 Cr)'
      case 'VERY_HIGH': return 'Very High (₹10 Cr+)'
      default: return 'Budget TBD'
    }
  }

  const getDevelopmentLabel = (status: string) => {
    switch (status) {
      case 'SHOOTING_SCRIPT': return 'Shooting Script'
      case 'FIRST_DRAFT': return 'First Draft'
      case 'TREATMENT': return 'Treatment'
      case 'ONE_LINE_ORDER': return 'One-line Order'
      case 'PITCH_DECK': return 'Pitch Deck'
      default: return status
    }
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown size'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading script details...</p>
        </div>
      </div>
    )
  }

  if (!script) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Script not found</h2>
        <p className="text-gray-600 mb-4">The script you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => router.push('/scripts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scripts
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">{script.title}</h1>
              {/* Permission Indicators */}
              {isOwner && (
                <Badge variant="secondary" className="text-xs">
                  Owner
                </Badge>
              )}
              {canManage && (
                <Badge variant="outline" className="text-xs">
                  Manager
                </Badge>
              )}
            </div>
            <p className="text-gray-600">By {script.writers}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Content Editing - Available to script owners (Producers/Readers) and management */}
          {canEditContent && (
            <Link href={`/scripts/${scriptId}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                {isOwner && !canManage ? 'Edit Content' : 'Edit Script'}
              </Button>
            </Link>
          )}
          
          {/* Management Actions - Only for Admins and Executives */}
          {canManage && (
            <Button
              variant="outline"
              onClick={handleFeatureToggle}
              disabled={updating}
            >
              {script.isFeatured ? (
                <>
                  <StarOff className="w-4 h-4 mr-2" />
                  Remove Featured
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Make Featured
                </>
              )}
            </Button>
          )}
          {script.files && script.files.length > 0 ? (
            <Button asChild>
              <a 
                href={script.files.find(f => f.fileType === 'SCREENPLAY')?.fileUrl || script.files[0]?.fileUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download {script.files.find(f => f.fileType === 'SCREENPLAY') ? 'Script' : 'File'}
              </a>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button disabled>
                <Download className="w-4 h-4 mr-2" />
                No Files Available
              </Button>
              {isOwner && (
                <Link href={`/scripts/${scriptId}/edit`}>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                </Link>
              )}
            </div>
          )}
          {session?.user?.role === 'ADMIN' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Script
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Script</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{script.title}"? This action cannot be undone and will permanently remove:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>The script and all its files</li>
                      <li>All assignments and feedback</li>
                      <li>All activity history</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Script'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Script Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Script Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(script.status)}>
                    {getStatusLabel(script.status)}
                  </Badge>
                  {script.isFeatured && (
                    <div className="bg-yellow-500 rounded-full p-1">
                      <Star className="w-4 h-4 text-white fill-current" />
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Type</h4>
                  <div className="flex items-center text-gray-600">
                    {script.type === 'FEATURE_FILM' ? (
                      <Film className="w-4 h-4 mr-2" />
                    ) : (
                      <Tv className="w-4 h-4 mr-2" />
                    )}
                    {script.type === 'FEATURE_FILM' ? 'Feature Film' : 'Web Series'}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Development Status</h4>
                  <p className="text-gray-600">{getDevelopmentLabel(script.developmentStatus)}</p>
                </div>
                
                {(script.genre || script.subGenre) && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Genre</h4>
                    <div className="flex flex-wrap gap-2">
                      {script.genre && (
                        <Badge variant="secondary">
                          {script.genre}
                        </Badge>
                      )}
                      {script.subGenre && (
                        <Badge variant="outline">
                          {script.subGenre}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {script.director && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Director</h4>
                    <p className="text-gray-600">{script.director}</p>
                  </div>
                )}
                
                {script.budgetRange && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Budget Range</h4>
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      {getBudgetLabel(script.budgetRange)}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Logline</h4>
                <p className="text-gray-700 leading-relaxed">{script.logline}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Synopsis</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{script.synopsis}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management Panel (Admin/Executive only) */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Update */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <Select value={script.status} onValueChange={handleStatusChange} disabled={updating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="READING">Reading</SelectItem>
                      <SelectItem value="CONSIDERED">Considered</SelectItem>
                      <SelectItem value="DEVELOPMENT">Development</SelectItem>
                      <SelectItem value="GREENLIT">Greenlit</SelectItem>
                      <SelectItem value="IN_PRODUCTION">In Production</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reading Progress */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Reading Progress</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={readingProgress}
                      onChange={(e) => setReadingProgress(Number(e.target.value))}
                      className="flex-1"
                      disabled={updating}
                    />
                    <span className="text-sm text-gray-600 w-12">{readingProgress}%</span>
                    <Button size="sm" onClick={handleProgressUpdate} disabled={updating}>
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Internal Notes</h4>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes about this script..."
                    rows={4}
                    disabled={updating}
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleNotesUpdate} disabled={updating}>
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meetings Section - For Admins, Executives, and Producers */}
          {(canManage || isProducer) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Meetings
                  {canManage && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      Management
                    </Badge>
                  )}
                  {isProducer && !canManage && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      Producer Access
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MeetingManager 
                  scriptId={scriptId}
                  showHeader={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Assignments Section - For Admins, Executives, and Readers */}
          {canAssign && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Assignments
                  <Badge variant="outline" className="text-xs ml-auto">
                    Management Only
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AssignmentManager 
                  scriptId={scriptId}
                  showHeader={false}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Assignment Info for Producers (who cannot create assignments) */}
          {!canAssign && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Your Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  {isOwner ? (
                    "As the script owner, you can edit content but cannot assign the script to others. Assignments are managed by Executives and Admins."
                  ) : (
                    "View assignments related to this script. Only Executives and Admins can create new assignments."
                  )}
                </p>
                <AssignmentManager 
                  scriptId={scriptId}
                  showHeader={false}
                  readOnly={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Feedback Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Feedback & Reviews
                </CardTitle>
                <FeedbackForm 
                  scriptId={scriptId}
                  scriptTitle={script.title}
                  onFeedbackCreated={() => window.location.reload()}
                  trigger={
                    <Button size="sm" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Feedback
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScriptFeedbackList scriptId={scriptId} />
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline 
                scriptId={scriptId}
                showHeader={false}
                limit={20}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="w-5 h-5" />
                Cover Image
                {isAdmin && script.coverImageUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Cover Image</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the cover image for "{script.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleFileDelete('cover_image', script.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Cover Image
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                {script.coverImageUrl && !imageError ? (
                  <Image
                    src={script.coverImageUrl}
                    alt={`${script.title} cover`}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    {!script.coverImageUrl ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-3">No cover image uploaded</p>
                        {isOwner && (
                          <Link href={`/scripts/${scriptId}/edit`}>
                            <Button size="sm" variant="outline">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Cover
                            </Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-red-500 mb-3">Cover image missing</p>
                        <p className="text-xs text-gray-500 mb-3">The image file was not found on the server</p>
                        {isOwner && (
                          <Link href={`/scripts/${scriptId}/edit`}>
                            <Button size="sm" variant="outline">
                              <Upload className="w-4 h-4 mr-2" />
                              Re-upload Cover
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${script.email}`} className="text-blue-600 hover:underline">
                  {script.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${script.phone}`} className="text-blue-600 hover:underline">
                  {script.phone}
                </a>
              </div>
              {script.user && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Submitted by {script.user.name || script.user.email}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Script Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {script.files && script.files.length > 0 ? (
                <div className="space-y-3">
                  {script.files.map((file) => (
                    <div key={file.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="flex-shrink-0">
                            {file.fileType === 'SCREENPLAY' && <FileText className="w-5 h-5 text-blue-600" />}
                            {file.fileType === 'PITCHDECK' && <FileText className="w-5 h-5 text-purple-600" />}
                            {file.fileType === 'TREATMENT' && <FileText className="w-5 h-5 text-green-600" />}
                            {file.fileType === 'ONELINE_ORDER' && <FileText className="w-5 h-5 text-orange-600" />}
                            {file.fileType === 'TEAM_PROFILE' && <FileText className="w-5 h-5 text-pink-600" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.fileName}
                              </p>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {file.fileType === 'SCREENPLAY' && 'Screenplay'}
                                {file.fileType === 'PITCHDECK' && 'Pitch Deck'}
                                {file.fileType === 'TREATMENT' && 'Treatment'}
                                {file.fileType === 'ONELINE_ORDER' && 'One-line Order'}
                                {file.fileType === 'TEAM_PROFILE' && 'Team Profile'}
                              </span>
                              {file.isLatest && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Latest
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              v{file.version} • {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)}
                            </p>
                            {file.uploader && (
                              <p className="text-xs text-gray-400">
                                Uploaded by {file.uploader.name || file.uploader.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(file.fileUrl, '_blank')}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete File</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{file.fileName}"? This action cannot be undone and will permanently remove the file from the system.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleFileDelete('script_file', file.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete File
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No files uploaded</p>
                </div>
              )}
              
              {/* File Summary */}
              <div className="border-t pt-3 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Total Files</h4>
                    <p className="text-gray-600">{script.files?.length || 0} file(s)</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Latest Version</h4>
                    <p className="text-gray-600">
                      v{Math.max(...(script.files?.map(f => f.version) || [1]))}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <h4 className="font-medium text-gray-900 mb-1">Submitted</h4>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(script.createdAt)}
                  </div>
                </div>
                {script.updatedAt !== script.createdAt && (
                  <div className="mt-2">
                    <h4 className="font-medium text-gray-900 mb-1">Last Updated</h4>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(script.updatedAt)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
