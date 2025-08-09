
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { User } from '@/lib/types'
import { Plus, Calendar, Clock, MapPin, Link as LinkIcon, Users, X, Loader2 } from 'lucide-react'

interface MeetingFormProps {
  scriptId?: string
  onMeetingCreated?: () => void
  trigger?: React.ReactNode
}

export function MeetingForm({ scriptId, onMeetingCreated, trigger }: MeetingFormProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    participants: [] as string[],
    meetingLink: '',
    location: '',
    duration: ''
  })

  // Fetch users for participant selection
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      // Filter out current user from participants list
      const filteredUsers = data.filter((user: User) => user.id !== session?.user?.id)
      setUsers(filteredUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to load team members for participant selection.",
        variant: "destructive"
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Meeting title is required.",
        variant: "destructive"
      })
      return
    }

    if (!formData.scheduledAt) {
      toast({
        title: "Validation Error", 
        description: "Please select a date and time for the meeting.",
        variant: "destructive"
      })
      return
    }

    // Validate future date
    const meetingDate = new Date(formData.scheduledAt)
    if (meetingDate <= new Date()) {
      toast({
        title: "Validation Error",
        description: "Meeting must be scheduled for a future date and time.",
        variant: "destructive"
      })
      return
    }

    if (!scriptId) {
      toast({
        title: "Error",
        description: "Script ID is required to schedule a meeting.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          ...formData,
          duration: formData.duration ? parseInt(formData.duration) : null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create meeting')
      }

      const meeting = await response.json()
      
      toast({
        title: "Meeting Scheduled",
        description: `Meeting "${meeting.title}" has been scheduled successfully.`
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        scheduledAt: '',
        participants: [],
        meetingLink: '',
        location: '',
        duration: ''
      })

      setOpen(false)
      onMeetingCreated?.()
    } catch (error) {
      console.error('Error creating meeting:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule meeting.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleParticipantToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }))
  }

  const removeParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(id => id !== userId)
    }))
  }

  // Get minimum datetime for input (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1) // Add 1 hour buffer
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  }

  const selectedUsers = users.filter(user => formData.participants.includes(user.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Meeting
          </DialogTitle>
          <DialogDescription>
            Schedule a meeting to discuss the script with team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Meeting Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Script Review Meeting"
              disabled={loading}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Discussion points, agenda, or additional notes..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Time *
              </Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                min={getMinDateTime()}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration (minutes)
              </Label>
              <Select
                value={formData.duration}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Link and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meetingLink" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Meeting Link
              </Label>
              <Input
                id="meetingLink"
                value={formData.meetingLink}
                onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                placeholder="https://zoom.us/j/123456789"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Conference Room A / Office Address"
                disabled={loading}
              />
            </div>
          </div>

          {/* Participants Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants
            </Label>
            
            {/* Selected Participants */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                {selectedUsers.map(user => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                    {user.name || user.email}
                    <button
                      type="button"
                      onClick={() => removeParticipant(user.id)}
                      className="ml-1 hover:text-red-600"
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Available Users */}
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading team members...
                </div>
              ) : users.length > 0 ? (
                users.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={formData.participants.includes(user.id)}
                      onChange={() => handleParticipantToggle(user.id)}
                      disabled={loading}
                      className="rounded border-gray-300"
                    />
                    <label 
                      htmlFor={`user-${user.id}`} 
                      className="flex-1 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <div className="font-medium">{user.name || 'No Name'}</div>
                      <div className="text-gray-500 text-xs">{user.email} • {user.role}</div>
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  No team members available for selection
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
