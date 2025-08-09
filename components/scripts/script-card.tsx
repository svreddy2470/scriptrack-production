
"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Film, 
  Tv, 
  Star
} from 'lucide-react'
import { Script } from '@/lib/types'
import { motion } from 'framer-motion'

interface ScriptCardProps {
  script: Script
  onStatusChange?: (scriptId: string, newStatus: string) => void
  onFeatureToggle?: (scriptId: string, featured: boolean) => void
  viewMode?: 'grid' | 'list'
}

export function ScriptCard({ script, onStatusChange, onFeatureToggle, viewMode = 'grid' }: ScriptCardProps) {
  const { data: session } = useSession()
  const [imageError, setImageError] = useState(false)

  const isOwner = script.submittedBy === session?.user?.id
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'EXECUTIVE'

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

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-white border border-gray-200">
        {/* Cover Image */}
        <div className={`relative ${viewMode === 'list' ? 'aspect-video' : 'aspect-[3/4]'} bg-gradient-to-br from-gray-100 to-gray-200`}>
          {script.coverImageUrl && !imageError ? (
            <Image
              src={script.coverImageUrl}
              alt={`${script.title} cover`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4">
              {script.type === 'FEATURE_FILM' ? (
                <Film className="w-16 h-16 text-gray-400 mb-2" />
              ) : (
                <Tv className="w-16 h-16 text-gray-400 mb-2" />
              )}
              {!script.coverImageUrl && isOwner && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">No cover image</p>
                  <Link href={`/scripts/${script.id}/edit`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Add Cover
                    </Button>
                  </Link>
                </div>
              )}
              {script.coverImageUrl && imageError && (
                <div className="text-center">
                  <p className="text-xs text-red-500 mb-2">Image missing</p>
                  {isOwner && (
                    <Link href={`/scripts/${script.id}/edit`}>
                      <Button size="sm" variant="outline" className="text-xs">
                        Re-upload
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <Badge className={`${getStatusColor(script.status)} font-medium`}>
              {getStatusLabel(script.status)}
            </Badge>
          </div>

          {/* Featured Star */}
          {script.isFeatured && (
            <div className="absolute top-2 right-2">
              <div className="bg-yellow-500 rounded-full p-1">
                <Star className="w-4 h-4 text-white fill-current" />
              </div>
            </div>
          )}


        </div>

        {/* Card Content */}
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Title and Type */}
            <div>
              <Link href={`/scripts/${script.id}`}>
                <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                  {script.title}
                </h3>
              </Link>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                {script.type === 'FEATURE_FILM' ? (
                  <Film className="w-4 h-4 mr-1" />
                ) : (
                  <Tv className="w-4 h-4 mr-1" />
                )}
                {script.type === 'FEATURE_FILM' ? 'Feature Film' : 'Web Series'}
              </div>
            </div>

            {/* Writer(s) */}
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="line-clamp-1">By {script.writers}</span>
            </div>

            {/* Logline */}
            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
              {script.logline}
            </p>

            {/* Genre Information */}
            {(script.genre || script.subGenre) && (
              <div className="flex flex-wrap gap-1">
                {script.genre && (
                  <Badge variant="secondary" className="text-xs">
                    {script.genre}
                  </Badge>
                )}
                {script.subGenre && (
                  <Badge variant="outline" className="text-xs">
                    {script.subGenre}
                  </Badge>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="space-y-2 text-xs text-gray-500">
              {script.budgetRange && (
                <div>{getBudgetLabel(script.budgetRange)}</div>
              )}
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Submitted {formatDate(script.createdAt)}
              </div>
              <div className="flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                {script.files?.length || 0} file{(script.files?.length || 0) !== 1 ? 's' : ''} uploaded
              </div>
              {script.files?.some(f => f.version > 1) && (
                <div>Updated files available</div>
              )}
            </div>

            {/* Contact Info (for admins/executives) */}
            {canManage && (
              <div className="pt-2 border-t space-y-1 text-xs text-gray-500">
                <div className="flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  {script.email}
                </div>
                <div className="flex items-center">
                  <Phone className="w-3 h-3 mr-1" />
                  {script.phone}
                </div>
              </div>
            )}

            {/* Progress Bar for Reading */}
            {canManage && script.readingProgress > 0 && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Reading Progress</span>
                  <span>{script.readingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
                    style={{ width: `${script.readingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
