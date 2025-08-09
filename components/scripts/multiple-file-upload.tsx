
"use client"

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { 
  Upload, 
  FileText, 
  Download, 
  History, 
  Loader2, 
  X, 
  File,
  Image as ImageIcon,
  Users,
  ListOrdered,
  Presentation
} from 'lucide-react'
import { ScriptFileType } from '@/lib/types'

interface FileUpload {
  id: string
  fileType: ScriptFileType
  fileName: string
  fileUrl: string
  fileSize: number
  version: number
  isLatest: boolean
  uploadedBy: string
  uploader?: {
    name: string | null
    email: string
  }
  createdAt: Date | string
  updatedAt: Date | string
}

interface MultipleFileUploadProps {
  scriptId?: string
  initialFiles?: Record<string, FileUpload[]>
  onFilesChange?: (files: Record<string, FileUpload[]>) => void
  mode?: 'submission' | 'edit'
}

const FILE_TYPE_CONFIGS = {
  SCREENPLAY: {
    label: 'Screenplay',
    description: 'Main script file',
    icon: FileText,
    color: 'bg-blue-500',
    required: false
  },
  PITCHDECK: {
    label: 'Pitch Deck',
    description: 'Presentation materials',
    icon: Presentation,
    color: 'bg-purple-500',
    required: false
  },
  TREATMENT: {
    label: 'Treatment',
    description: 'Story treatment document',
    icon: File,
    color: 'bg-green-500',
    required: false
  },
  ONELINE_ORDER: {
    label: 'One-line Order',
    description: 'Brief story summary',
    icon: ListOrdered,
    color: 'bg-orange-500',
    required: false
  },
  STORYBOARD: {
    label: 'Storyboard',
    description: 'Visual storyboard files',
    icon: ImageIcon,
    color: 'bg-cyan-500',
    required: false
  },
  TEAM_PROFILE: {
    label: 'Team Profile',
    description: 'Team member information',
    icon: Users,
    color: 'bg-pink-500',
    required: false
  }
}

export function MultipleFileUpload({ 
  scriptId, 
  initialFiles, 
  onFilesChange, 
  mode = 'submission' 
}: MultipleFileUploadProps) {
  const { data: session } = useSession()
  const [files, setFiles] = useState<Record<string, FileUpload[]>>(initialFiles || {})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [dragOver, setDragOver] = useState<string | null>(null)

  const updateFiles = useCallback((newFiles: Record<string, FileUpload[]>) => {
    setFiles(newFiles)
    onFilesChange?.(newFiles)
  }, [onFilesChange])

  const handleFileUpload = async (fileType: ScriptFileType, file: File) => {
    if (!scriptId && mode === 'edit') {
      toast({
        title: 'Error',
        description: 'Script ID is required for file upload',
        variant: 'destructive'
      })
      return
    }

    setUploading(prev => ({ ...prev, [fileType]: true }))

    try {
      // Step 1: Upload file to storage
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', fileType.toLowerCase())

      console.log('Uploading file:', { fileType, fileName: file.name, size: file.size })

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      console.log('File uploaded successfully:', uploadResult)

      // Step 2: For edit mode, also add file to script in database
      if (mode === 'edit' && scriptId) {
        const addFileResponse = await fetch(`/api/scripts/${scriptId}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileType,
            fileName: file.name,
            fileUrl: uploadResult.fileUrl || uploadResult.url,
            fileSize: file.size
          })
        })

        const addFileResult = await addFileResponse.json()

        if (!addFileResponse.ok) {
          throw new Error(addFileResult.error || 'Failed to add file to script')
        }

        console.log('File added to script successfully:', addFileResult)

        // Update local state with the database result
        const newFile: FileUpload = {
          id: addFileResult.id,
          fileType,
          fileName: addFileResult.fileName,
          fileUrl: addFileResult.fileUrl,
          fileSize: addFileResult.fileSize,
          version: addFileResult.version,
          isLatest: addFileResult.isLatest,
          uploadedBy: addFileResult.uploadedBy,
          uploader: addFileResult.uploader,
          createdAt: addFileResult.createdAt,
          updatedAt: addFileResult.updatedAt
        }

        const newFiles = { ...files }
        if (!newFiles[fileType]) {
          newFiles[fileType] = []
        }
        // Replace existing latest file or add new one
        const existingIndex = newFiles[fileType].findIndex(f => f.isLatest)
        if (existingIndex >= 0) {
          newFiles[fileType][existingIndex] = { ...newFiles[fileType][existingIndex], isLatest: false }
        }
        newFiles[fileType].unshift(newFile)
        updateFiles(newFiles)
      } else {
        // For submission mode, just update local state
        const newFile: FileUpload = {
          id: `temp-${Date.now()}`,
          fileType,
          fileName: file.name,
          fileUrl: uploadResult.fileUrl || uploadResult.url,
          fileSize: file.size,
          version: 1,
          isLatest: true,
          uploadedBy: session?.user?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const newFiles = { ...files }
        newFiles[fileType] = [newFile]
        updateFiles(newFiles)
      }

      toast({
        title: 'Success',
        description: `${FILE_TYPE_CONFIGS[fileType].label} uploaded successfully`
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive'
      })
    } finally {
      setUploading(prev => ({ ...prev, [fileType]: false }))
    }
  }

  const handleDrop = (e: React.DragEvent, fileType: ScriptFileType) => {
    e.preventDefault()
    setDragOver(null)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFileUpload(fileType, droppedFiles[0])
    }
  }

  const handleDragOver = (e: React.DragEvent, fileType: ScriptFileType) => {
    e.preventDefault()
    setDragOver(fileType)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
  }

  const removeFile = (fileType: ScriptFileType, fileId: string) => {
    const newFiles = { ...files }
    if (newFiles[fileType]) {
      newFiles[fileType] = newFiles[fileType].filter(f => f.id !== fileId)
      if (newFiles[fileType].length === 0) {
        delete newFiles[fileType]
      }
    }
    updateFiles(newFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Upload Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          File Upload Status
        </h3>
        <div className="space-y-2">
          {Object.entries(FILE_TYPE_CONFIGS).map(([fileType, config]) => {
            const typedFileType = fileType as ScriptFileType
            const hasFile = files[typedFileType]?.some(f => f.isLatest)
            const isUploading = uploading[typedFileType]
            return (
              <div key={fileType} className="flex items-center gap-3 py-2 px-3 bg-white rounded border">
                <div className={`w-3 h-3 rounded-full ${
                  isUploading ? 'bg-yellow-400 animate-pulse' : 
                  hasFile ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <config.icon className={`w-4 h-4 text-white p-0.5 rounded ${config.color}`} />
                <span className={`flex-1 text-sm font-medium ${
                  hasFile ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-500">
                  {isUploading ? 'Uploading...' : hasFile ? 'Uploaded' : 'Not uploaded'}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-xs text-gray-600">
          * At least one file required among: Screenplay, Pitch Deck, Treatment, or One-line Order
        </div>
      </div>

      {/* File Upload Areas - Vertical Layout */}
      <div className="space-y-4">
        {Object.entries(FILE_TYPE_CONFIGS).map(([fileType, config]) => {
          const typedFileType = fileType as ScriptFileType
          const typeFiles = files[typedFileType] || []
          const latestFile = typeFiles.find(f => f.isLatest)
          const isUploading = uploading[typedFileType]
          const isDragOver = dragOver === typedFileType

          return (
            <Card 
              key={fileType} 
              className={`transition-all duration-200 ${
                isDragOver ? 'border-blue-500 bg-blue-50' : ''
              } ${config.required && !latestFile ? 'border-orange-300' : ''}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <config.icon className={`w-5 h-5 text-white p-1 rounded ${config.color}`} />
                  {config.label}
                  {config.required && (
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  )}
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDrop={(e) => handleDrop(e, typedFileType)}
                  onDragOver={(e) => handleDragOver(e, typedFileType)}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(typedFileType, file)
                    }}
                    className="hidden"
                    id={`file-${fileType}`}
                    disabled={isUploading}
                  />
                  <label htmlFor={`file-${fileType}`} className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">
                        {isUploading ? 'Uploading...' : 'Click or drag to upload'}
                      </span>
                      <span className="text-xs text-gray-500">
                        PDF, DOC, DOCX, PPT, PPTX (max 25MB)
                      </span>
                    </div>
                  </label>
                </div>

                {/* Current File */}
                {latestFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-green-800 truncate">
                            {latestFile.fileName}
                          </p>
                          <p className="text-xs text-green-600">
                            v{latestFile.version} • {formatFileSize(latestFile.fileSize)} • {formatDate(latestFile.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(latestFile.fileUrl, '_blank')}
                          className="text-green-600 hover:text-green-800 p-1"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        {mode === 'submission' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(typedFileType, latestFile.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Version History */}
                {typeFiles.length > 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <History className="w-4 h-4" />
                      Previous Versions
                    </div>
                    {typeFiles
                      .filter(f => !f.isLatest)
                      .slice(0, 3)
                      .map((file) => (
                        <div key={file.id} className="bg-gray-50 border border-gray-200 rounded p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-700 truncate">
                                  {file.fileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  v{file.version} • {formatDate(file.createdAt)}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(file.fileUrl, '_blank')}
                              className="text-gray-500 hover:text-gray-700 p-1"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {typeFiles.length > 4 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{typeFiles.length - 4} more versions
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
