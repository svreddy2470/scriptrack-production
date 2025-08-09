
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, AlertCircle, Plus, Clock, Flag } from 'lucide-react'
import { User as UserType, Script, AssignmentPriority } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface AssignmentFormProps {
  scriptId?: string
  onAssignmentCreated?: () => void
  trigger?: React.ReactNode
}

export function AssignmentForm({ scriptId, onAssignmentCreated, trigger }: AssignmentFormProps) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserType[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [selectedScript, setSelectedScript] = useState<Script | null>(null)
  
  const [formData, setFormData] = useState({
    scriptId: scriptId || '',
    assignedTo: '',
    dueDate: '',
    notes: '',
    priority: 'MEDIUM' as AssignmentPriority
  })

  // Wait for session to load before determining permissions
  const isSessionLoading = status === 'loading'
  const canAssign = !isSessionLoading && (session?.user?.role === 'ADMIN' || session?.user?.role === 'EXECUTIVE' || session?.user?.role === 'READER')

  // Show loading state while session is loading
  if (isSessionLoading) {
    return null
  }

  if (!canAssign) {
    return null
  }

  useEffect(() => {
    if (open) {
      fetchUsers()
      if (!scriptId) {
        fetchScripts()
      }
    }
  }, [open, scriptId])

  useEffect(() => {
    if (scriptId && scripts.length > 0) {
      const script = scripts.find(s => s.id === scriptId)
      setSelectedScript(script || null)
    }
  }, [scriptId, scripts])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/users?forAssignment=true&excludeUserId=${session?.user?.id}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive"
      })
    }
  }

  const fetchScripts = async () => {
    try {
      const response = await fetch('/api/scripts')
      if (!response.ok) throw new Error('Failed to fetch scripts')
      const data = await response.json()
      setScripts(data)
    } catch (error) {
      console.error('Error fetching scripts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch scripts. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.scriptId || !formData.assignedTo) {
      toast({
        title: "Missing Information",
        description: "Please select both a script and assignee.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create assignment')
      }

      toast({
        title: "Assignment Created",
        description: "Script has been successfully assigned."
      })

      setFormData({
        scriptId: scriptId || '',
        assignedTo: '',
        dueDate: '',
        notes: '',
        priority: 'MEDIUM'
      })
      setOpen(false)
      onAssignmentCreated?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(u => u.id === formData.assignedTo)
  const currentScript = scriptId ? selectedScript || scripts.find(s => s.id === scriptId) : scripts.find(s => s.id === formData.scriptId)

  const getPriorityColor = (priority: AssignmentPriority) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50 border-red-200'
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'LOW': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'EXECUTIVE': return 'Executive/Manager'
      case 'PRODUCER': return 'Producer'
      case 'READER': return 'Reader'
      default: return role?.charAt(0) + role?.slice(1).toLowerCase()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Assign Script
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Create Assignment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Script Selection */}
          {!scriptId && (
            <div className="space-y-2">
              <Label htmlFor="script">Select Script *</Label>
              <Select 
                value={formData.scriptId} 
                onValueChange={(value) => setFormData({ ...formData, scriptId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a script to assign..." />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((script) => (
                    <SelectItem key={script.id} value={script.id}>
                      <div className="flex items-center gap-2">
                        <span>{script.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {script.status === 'SUBMITTED' ? 'Submitted' :
                           script.status === 'READING' ? 'Reading' :
                           script.status === 'CONSIDERED' ? 'Considered' :
                           script.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Script Preview */}
          {currentScript && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Selected Script</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <div className="w-16 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded overflow-hidden flex-shrink-0">
                  {currentScript.coverImageUrl ? (
                    <Image
                      src={currentScript.coverImageUrl}
                      alt={currentScript.title}
                      width={64}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <AlertCircle className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{currentScript.title}</h4>
                  <p className="text-sm text-gray-600">By {currentScript.writers}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{currentScript.logline}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assign To *</Label>
            <Select 
              value={formData.assignedTo} 
              onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose team member..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        {user.photoUrl ? (
                          <Image
                            src={user.photoUrl}
                            alt={user.name || ''}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <User className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{user.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected User Preview */}
          {selectedUser && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {selectedUser.photoUrl ? (
                    <Image
                      src={selectedUser.photoUrl}
                      alt={selectedUser.name || ''}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getRoleDisplayName(selectedUser.role)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: AssignmentPriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      <Flag className="w-3 h-3 text-gray-500" />
                      <span>Low Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      <Flag className="w-3 h-3 text-blue-500" />
                      <span>Medium Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      <Flag className="w-3 h-3 text-orange-500" />
                      <span>High Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      <Flag className="w-3 h-3 text-red-500" />
                      <span>Urgent</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific instructions or context for this assignment..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Priority Preview */}
          <div className={`p-3 rounded-lg border ${getPriorityColor(formData.priority)}`}>
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              <span className="font-medium">
                {formData.priority === 'URGENT' ? 'Urgent Priority' :
                 formData.priority === 'HIGH' ? 'High Priority' :
                 formData.priority === 'MEDIUM' ? 'Medium Priority' :
                 'Low Priority'}
              </span>
              {formData.dueDate && (
                <>
                  <span className="text-gray-400">•</span>
                  <Clock className="w-4 h-4" />
                  <span>Due {new Date(formData.dueDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating Assignment...' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
