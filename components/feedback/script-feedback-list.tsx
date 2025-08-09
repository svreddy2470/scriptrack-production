
"use client"

import { useState, useEffect } from 'react'
import { FeedbackCard } from './feedback-card'
import { Feedback } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Filter, MessageSquare } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface ScriptFeedbackListProps {
  scriptId: string
}

export function ScriptFeedbackList({ scriptId }: ScriptFeedbackListProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchFeedback()
  }, [scriptId])

  const fetchFeedback = async () => {
    try {
      const response = await fetch(`/api/feedback?scriptId=${scriptId}`)
      if (!response.ok) throw new Error('Failed to fetch feedback')
      
      const data = await response.json()
      setFeedback(data)
    } catch (error) {
      console.error('Error fetching feedback:', error)
      toast({
        title: "Error",
        description: "Failed to fetch feedback. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (feedbackItem: Feedback) => {
    // TODO: Implement feedback editing
    console.log('Edit feedback:', feedbackItem)
  }

  const handleDelete = (feedbackId: string) => {
    setFeedback(prev => prev.filter(f => f.id !== feedbackId))
  }

  const filteredFeedback = feedback.filter(item => 
    categoryFilter === 'ALL' || item.category === categoryFilter
  )

  // Group feedback by category
  const feedbackStats = {
    total: feedback.length,
    general: feedback.filter(f => f.category === 'GENERAL').length,
    scriptQuality: feedback.filter(f => f.category === 'SCRIPT_QUALITY').length,
    marketability: feedback.filter(f => f.category === 'MARKETABILITY').length,
    production: feedback.filter(f => f.category === 'PRODUCTION_NOTES').length,
    development: feedback.filter(f => f.category === 'DEVELOPMENT_SUGGESTIONS').length,
    averageRating: feedback.filter(f => f.rating).length > 0 
      ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
      : null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading feedback...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Feedback Stats */}
      {feedback.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Feedback</div>
            <div className="text-2xl font-bold text-blue-900">{feedbackStats.total}</div>
          </div>
          
          {feedbackStats.averageRating && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">Avg Rating</div>
              <div className="text-2xl font-bold text-yellow-900">{feedbackStats.averageRating}/10</div>
            </div>
          )}
          
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Script Quality</div>
            <div className="text-2xl font-bold text-green-900">{feedbackStats.scriptQuality}</div>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Development</div>
            <div className="text-2xl font-bold text-purple-900">{feedbackStats.development}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {feedback.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by category:</span>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="SCRIPT_QUALITY">Script Quality</SelectItem>
              <SelectItem value="MARKETABILITY">Marketability</SelectItem>
              <SelectItem value="PRODUCTION_NOTES">Production Notes</SelectItem>
              <SelectItem value="DEVELOPMENT_SUGGESTIONS">Development</SelectItem>
            </SelectContent>
          </Select>
          {categoryFilter !== 'ALL' && (
            <Badge variant="outline">{filteredFeedback.length} feedback items</Badge>
          )}
        </div>
      )}

      {/* Feedback List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredFeedback.map((feedbackItem, index) => (
            <motion.div
              key={feedbackItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <FeedbackCard
                feedback={feedbackItem}
                onEdit={handleEdit}
                onDelete={handleDelete}
                showScript={false}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredFeedback.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {categoryFilter !== 'ALL' ? 'No feedback in this category' : 'No feedback yet'}
          </h3>
          <p className="text-gray-600">
            {categoryFilter !== 'ALL' 
              ? `No feedback has been provided in the ${categoryFilter.toLowerCase().replace('_', ' ')} category yet.`
              : 'This script hasn\'t received any feedback yet. Be the first to provide feedback!'
            }
          </p>
        </div>
      )}
    </div>
  )
}
