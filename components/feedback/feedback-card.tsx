
"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  User, 
  Star, 
  Lock, 
  Globe, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Calendar,
  MessageSquare
} from 'lucide-react'
import { Feedback, FeedbackCategory } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'

interface FeedbackCardProps {
  feedback: Feedback
  onEdit?: (feedback: Feedback) => void
  onDelete?: (feedbackId: string) => void
  showScript?: boolean
}

export function FeedbackCard({ feedback, onEdit, onDelete, showScript = false }: FeedbackCardProps) {
  const { data: session } = useSession()
  const [deleting, setDeleting] = useState(false)

  const isOwner = feedback.userId === session?.user?.id
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'EXECUTIVE'
  const canEdit = isOwner || canManage
  const canDelete = isOwner || canManage

  const getCategoryLabel = (category: FeedbackCategory) => {
    switch (category) {
      case 'GENERAL': return 'General'
      case 'SCRIPT_QUALITY': return 'Script Quality'
      case 'MARKETABILITY': return 'Marketability'
      case 'PRODUCTION_NOTES': return 'Production'
      case 'DEVELOPMENT_SUGGESTIONS': return 'Development'
      default: return category
    }
  }

  const getCategoryColor = (category: FeedbackCategory) => {
    switch (category) {
      case 'GENERAL': return 'bg-gray-100 text-gray-800'
      case 'SCRIPT_QUALITY': return 'bg-blue-100 text-blue-800'
      case 'MARKETABILITY': return 'bg-green-100 text-green-800'
      case 'PRODUCTION_NOTES': return 'bg-purple-100 text-purple-800'
      case 'DEVELOPMENT_SUGGESTIONS': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600'
    if (rating >= 6) return 'text-yellow-600'
    if (rating >= 4) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDelete = async () => {
    if (!canDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/feedback/${feedback.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete feedback')

      toast({
        title: "Feedback Deleted",
        description: "Feedback has been successfully deleted."
      })

      onDelete?.(feedback.id)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete feedback.",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  // Don't show private feedback to non-authorized users
  if (feedback.isPrivate && !canManage && !isOwner) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 bg-white border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                {feedback.user?.photoUrl ? (
                  <Image
                    src={feedback.user.photoUrl}
                    alt={feedback.user.name || ''}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{feedback.user?.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {feedback.user?.role === 'EXECUTIVE' ? 'Executive' :
                     feedback.user?.role === 'PRODUCER' ? 'Producer' :
                     feedback.user?.role === 'READER' ? 'Reader' :
                     feedback.user?.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(feedback.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(feedback)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Feedback
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600" disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Feedback
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Script Info (if showing) */}
          {showScript && feedback.script && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Feedback for:</span>
                <span className="font-medium">{feedback.script.title}</span>
                <span className="text-gray-500">by {feedback.script.writers}</span>
              </div>
            </div>
          )}

          {/* Category and Rating */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getCategoryColor(feedback.category)}>
              {getCategoryLabel(feedback.category)}
            </Badge>
            
            {feedback.rating && (
              <Badge variant="outline" className={`${getRatingColor(feedback.rating)} border-current`}>
                <Star className="w-3 h-3 mr-1 fill-current" />
                {feedback.rating}/10
              </Badge>
            )}

            {feedback.isPrivate && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </Badge>
            )}

            {!feedback.isPrivate && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Globe className="w-3 h-3 mr-1" />
                Public
              </Badge>
            )}
          </div>

          {/* Feedback Content */}
          <div className="space-y-3">
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {feedback.comments}
            </div>
          </div>

          {/* Assignment Link (if applicable) */}
          {feedback.assignment && (
            <div className="text-xs text-gray-500 pt-2 border-t">
              <div className="flex items-center gap-1">
                <span>Related to assignment</span>
                {feedback.assignment.dueDate && (
                  <>
                    <span>•</span>
                    <span>Due {formatDate(feedback.assignment.dueDate)}</span>
                  </>
                )}
                <span>•</span>
                <span className={`font-medium ${
                  feedback.assignment.status === 'COMPLETED' ? 'text-green-600' :
                  feedback.assignment.status === 'IN_PROGRESS' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {feedback.assignment.status === 'COMPLETED' ? 'Completed' :
                   feedback.assignment.status === 'IN_PROGRESS' ? 'In Progress' :
                   'Pending'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
