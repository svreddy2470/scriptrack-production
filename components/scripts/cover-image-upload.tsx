
"use client"

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { 
  Upload, 
  ImageIcon, 
  Loader2, 
  X, 
  Camera,
  FileImage
} from 'lucide-react'

interface CoverImageUploadProps {
  currentImageUrl?: string | null
  onImageChange?: (imageUrl: string | null) => void
  disabled?: boolean
}

export function CoverImageUpload({ 
  currentImageUrl, 
  onImageChange, 
  disabled = false 
}: CoverImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState(false)

  const updateImage = useCallback((url: string | null) => {
    setImageUrl(url)
    onImageChange?.(url)
    setImageError(false)
  }, [onImageChange])

  const handleImageUpload = async (file: File) => {
    setUploading(true)

    try {
      // Client-side validation before upload
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please select a JPEG, PNG, or WebP image.')
      }

      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error('File too large. Please select an image under 10MB.')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cover')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Upload failed (${response.status})`)
      }

      const newImageUrl = result.fileUrl || result.url
      
      // Validate the returned URL
      if (!newImageUrl) {
        throw new Error('Invalid response from server - no file URL received')
      }
      
      // Ensure URL is properly formatted
      const cleanUrl = newImageUrl.startsWith('/') ? newImageUrl : `/${newImageUrl}`
      updateImage(cleanUrl)

      toast({
        title: 'Success',
        description: 'Cover image uploaded successfully'
      })
    } catch (error: any) {
      console.error('Cover image upload error:', error)
      
      let errorMessage = 'Failed to upload cover image'
      if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    updateImage(null)
    toast({
      title: 'Image removed',
      description: 'Cover image has been removed'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Cover Image
        </CardTitle>
        <CardDescription>
          Upload a cover image for your script (Optional)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Image Display */}
        {imageUrl ? (
          <div className="space-y-3">
            <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border">
              {!imageError ? (
                <Image
                  src={imageUrl}
                  alt="Script cover"
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileImage className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Current cover image
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('cover-image-input') as HTMLInputElement
                    input?.click()
                  }}
                  disabled={disabled || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Change
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={removeImage}
                  disabled={disabled || uploading}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Upload Area */
          <div className="border-2 border-dashed rounded-lg p-8 text-center border-gray-300 hover:border-blue-400 transition-colors">
            <div className="flex flex-col items-center space-y-4">
              {uploading ? (
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {uploading ? 'Uploading...' : 'Add Cover Image'}
                </p>
                <p className="text-sm text-gray-600">
                  Click to upload a cover image for your script
                </p>
                <p className="text-xs text-gray-500">
                  Supports: JPEG, PNG, WebP • Max 10MB
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.getElementById('cover-image-input') as HTMLInputElement
                  input?.click()
                }}
                disabled={disabled || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageUpload(file)
          }}
          className="hidden"
          id="cover-image-input"
          disabled={disabled || uploading}
        />

        {/* Upload Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FileImage className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Image Guidelines:</p>
              <ul className="text-xs space-y-1">
                <li>• Recommended aspect ratio: 3:4 (portrait)</li>
                <li>• High quality images work best</li>
                <li>• Cover image helps your script stand out</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
