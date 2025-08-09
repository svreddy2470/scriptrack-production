
"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Star, Lock, Globe, Plus } from 'lucide-react'
import { FeedbackCategory } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'

interface FeedbackFormProps {
  scriptId: string
  assignmentId?: string
  scriptTitle?: string
  onFeedbackCreated?: () => void
  trigger?: React.ReactNode
}

export function FeedbackForm({ 
  scriptId, 
  assignmentId, 
  scriptTitle, 
  onFeedbackCreated,
  trigger 
}: FeedbackFormProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    rating: '',
    comments: '',
    category: 'GENERAL' as FeedbackCategory,
    isPrivate: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.comments.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your feedback comments.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          assignmentId: assignmentId || null,
          rating: formData.rating ? parseInt(formData.rating) : null,
          comments: formData.comments,
          category: formData.category,
          isPrivate: formData.isPrivate
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit feedback')
      }

      toast({
        title: "Feedback Submitted",
        description: "Your feedback has been successfully submitted."
      })

      setFormData({
        rating: '',
        comments: '',
        category: 'GENERAL',
        isPrivate: false
      })
      setOpen(false)
      onFeedbackCreated?.()
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

  const getCategoryLabel = (category: FeedbackCategory) => {
    switch (category) {
      case 'GENERAL': return 'General Feedback'
      case 'SCRIPT_QUALITY': return 'Script Quality'
      case 'MARKETABILITY': return 'Marketability'
      case 'PRODUCTION_NOTES': return 'Production Notes'
      case 'DEVELOPMENT_SUGGESTIONS': return 'Development Suggestions'
      default: return category
    }
  }

  const getCategoryDescription = (category: FeedbackCategory) => {
    switch (category) {
      case 'GENERAL': return 'Overall thoughts and impressions'
      case 'SCRIPT_QUALITY': return 'Writing quality, structure, dialogue'
      case 'MARKETABILITY': return 'Commercial appeal and audience potential'
      case 'PRODUCTION_NOTES': return 'Technical and production considerations'
      case 'DEVELOPMENT_SUGGESTIONS': return 'Ideas for script improvement'
      default: return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Provide Feedback
          </DialogTitle>
          {scriptTitle && (
            <p className="text-sm text-gray-600">For: {scriptTitle}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-3">
            <Label htmlFor="rating">Overall Rating (Optional)</Label>
            <Select 
              value={formData.rating} 
              onValueChange={(value) => setFormData({ ...formData, rating: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a rating (1-10)..." />
              </SelectTrigger>
              <SelectContent>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => (
                  <SelectItem key={rating} value={rating.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center font-medium">{rating}</span>
                      <div className="flex">
                        {[...Array(Math.ceil(rating / 2))].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current text-yellow-500" />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {rating >= 9 ? 'Excellent' :
                         rating >= 8 ? 'Very Good' :
                         rating >= 7 ? 'Good' :
                         rating >= 6 ? 'Above Average' :
                         rating >= 5 ? 'Average' :
                         rating >= 4 ? 'Below Average' :
                         rating >= 3 ? 'Poor' :
                         rating >= 2 ? 'Very Poor' :
                         'Terrible'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-3">
            <Label htmlFor="category">Feedback Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value: FeedbackCategory) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['GENERAL', 'SCRIPT_QUALITY', 'MARKETABILITY', 'PRODUCTION_NOTES', 'DEVELOPMENT_SUGGESTIONS'].map((category) => (
                  <SelectItem key={category} value={category}>
                    <div>
                      <div className="font-medium">{getCategoryLabel(category as FeedbackCategory)}</div>
                      <div className="text-xs text-gray-500">{getCategoryDescription(category as FeedbackCategory)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <Label htmlFor="comments">Your Feedback *</Label>
            <Textarea
              id="comments"
              placeholder="Share your detailed thoughts, suggestions, and observations about the script..."
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={8}
              required
              className="min-h-[200px]"
            />
            <div className="text-xs text-gray-500">
              {formData.comments.length} characters
            </div>
          </div>

          {/* Privacy Setting */}
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {formData.isPrivate ? (
                    <Lock className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Globe className="w-5 h-5 text-green-600" />
                  )}
                  <div>
                    <div className="font-medium">
                      {formData.isPrivate ? 'Private Feedback' : 'Public Feedback'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formData.isPrivate 
                        ? 'Only visible to admins and executives'
                        : 'Visible to all team members'
                      }
                    </div>
                  </div>
                </div>
                <Switch
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{getCategoryLabel(formData.category)}</Badge>
                {formData.rating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    {formData.rating}/10
                  </Badge>
                )}
                {formData.isPrivate && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-800">
                {formData.comments || 'Your feedback will appear here...'}
              </div>
              <div className="text-xs text-gray-500">
                By {session?.user?.name} • {new Date().toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
