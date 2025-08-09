
"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { 
  Upload, 
  FileText, 
  Download, 
  Loader2, 
  X, 
  File,
  Users,
  ListOrdered,
  Presentation,
  CheckCircle,
  Image as ImageIcon
} from 'lucide-react'
import { ScriptFileType } from '@/lib/types'

interface UploadedFile {
  fileType: ScriptFileType
  fileName: string
  fileUrl: string
  fileSize: number
}

interface SimpleFileUploadProps {
  initialFiles?: UploadedFile[]
  onFilesChange?: (files: UploadedFile[]) => void
}

// File size limits (in bytes)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB per file
const MAX_TOTAL_SIZE = 100 * 1024 * 1024 // 100MB total per script
const WARN_TOTAL_SIZE = 80 * 1024 * 1024 // 80MB warning threshold

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const FILE_TYPE_CONFIGS = {
  SCREENPLAY: {
    label: 'Screenplay',
    description: 'Main script file (Optional)',
    icon: FileText,
    color: 'bg-blue-500',
    required: false,
    acceptTypes: '.pdf,.doc,.docx'
  },
  PITCHDECK: {
    label: 'Pitch Deck',
    description: 'Presentation materials (Optional)',
    icon: Presentation,
    color: 'bg-purple-500',
    required: false,
    acceptTypes: '.pdf,.ppt,.pptx'
  },
  TREATMENT: {
    label: 'Treatment',
    description: 'Story treatment document (Optional)',
    icon: File,
    color: 'bg-green-500',
    required: false,
    acceptTypes: '.pdf,.doc,.docx'
  },
  ONELINE_ORDER: {
    label: 'One-line Order',
    description: 'Brief story summary (Optional)',
    icon: ListOrdered,
    color: 'bg-orange-500',
    required: false,
    acceptTypes: '.pdf,.doc,.docx'
  },
  STORYBOARD: {
    label: 'Storyboard',
    description: 'Visual storyboard files (Optional)',
    icon: ImageIcon,
    color: 'bg-cyan-500',
    required: false,
    acceptTypes: '.pdf,.jpg,.jpeg,.png,.ppt,.pptx'
  },
  TEAM_PROFILE: {
    label: 'Team Profile',
    description: 'Team member information (Optional)',
    icon: Users,
    color: 'bg-pink-500',
    required: false,
    acceptTypes: '.pdf,.doc,.docx'
  }
}

export function SimpleFileUpload({ initialFiles = [], onFilesChange }: SimpleFileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const updateFiles = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles)
    onFilesChange?.(newFiles)
  }, [onFilesChange])

  const handleFileUpload = async (fileType: ScriptFileType, file: File) => {
    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: `File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`,
        variant: 'destructive'
      })
      return
    }

    // Calculate total size after upload
    const existingFileIndex = files.findIndex(f => f.fileType === fileType)
    const currentTotalSize = files.reduce((sum, f) => sum + f.fileSize, 0)
    const existingFileSize = existingFileIndex >= 0 ? files[existingFileIndex].fileSize : 0
    const newTotalSize = currentTotalSize - existingFileSize + file.size

    if (newTotalSize > MAX_TOTAL_SIZE) {
      toast({
        title: 'Total size limit exceeded',
        description: `Adding this file would exceed the total size limit of ${formatFileSize(MAX_TOTAL_SIZE)}. Current total: ${formatFileSize(currentTotalSize)}`,
        variant: 'destructive'
      })
      return
    }

    // Show warning if approaching limit
    if (newTotalSize > WARN_TOTAL_SIZE && currentTotalSize <= WARN_TOTAL_SIZE) {
      toast({
        title: 'Approaching size limit',
        description: `Total file size will be ${formatFileSize(newTotalSize)}. Consider optimizing files to stay under ${formatFileSize(MAX_TOTAL_SIZE)}`,
      })
    }
    
    setUploading(prev => ({ ...prev, [fileType]: true }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', fileType.toLowerCase())

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      const newFile: UploadedFile = {
        fileType,
        fileName: file.name,
        fileUrl: result.fileUrl || result.url,
        fileSize: file.size
      }

      // Update files list
      const newFiles = [...files]
      if (existingFileIndex >= 0) {
        // Replace existing file
        newFiles[existingFileIndex] = newFile
      } else {
        // Add new file
        newFiles.push(newFile)
      }
      
      updateFiles(newFiles)

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

  const removeFile = (fileType: ScriptFileType) => {
    const newFiles = files.filter(f => f.fileType !== fileType)
    updateFiles(newFiles)
    
    toast({
      title: 'File removed',
      description: `${FILE_TYPE_CONFIGS[fileType].label} has been removed`
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileForType = (fileType: ScriptFileType) => {
    return files.find(f => f.fileType === fileType)
  }

  const hasRequiredFiles = () => {
    const requiredFileTypes = ['SCREENPLAY', 'PITCHDECK', 'TREATMENT', 'ONELINE_ORDER']
    return files.some(f => requiredFileTypes.includes(f.fileType))
  }

  return (
    <div className="space-y-6">
      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(FILE_TYPE_CONFIGS).map(([fileType, config]) => {
          const typedFileType = fileType as ScriptFileType
          const existingFile = getFileForType(typedFileType)
          const isUploading = uploading[typedFileType]

          return (
            <Card 
              key={fileType} 
              className={`transition-all duration-200 ${
                config.required && !existingFile ? 'border-orange-300 bg-orange-50/20' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <config.icon className={`w-5 h-5 text-white p-1 rounded ${config.color}`} />
                  {config.label}
                  {config.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                  {existingFile && (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  )}
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Current File Display */}
                {existingFile ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-green-800 truncate">
                            {existingFile.fileName}
                          </p>
                          <p className="text-xs text-green-600">
                            {formatFileSize(existingFile.fileSize)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(existingFile.fileUrl, '_blank')}
                          className="text-green-600 hover:text-green-800 p-1"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(typedFileType)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Upload Area */
                  <div className="border-2 border-dashed rounded-lg p-4 text-center border-gray-300 hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept={config.acceptTypes}
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
                          {isUploading ? 'Uploading...' : 'Click to upload'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Accepts: {config.acceptTypes.replace(/\./g, '').toUpperCase()}
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upload Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Upload Summary</h3>
            <div className="text-right">
              <Badge variant={hasRequiredFiles() ? "default" : "secondary"}>
                {hasRequiredFiles() ? "Ready to Submit" : "Add mandatory files"}
              </Badge>
              {!hasRequiredFiles() && (
                <p className="text-xs text-gray-600 mt-1">
                  Upload at least one: Screenplay, Pitch Deck, Treatment, or One-line Order
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            {Object.entries(FILE_TYPE_CONFIGS).map(([fileType, config]) => {
              const typedFileType = fileType as ScriptFileType
              const hasFile = getFileForType(typedFileType)
              
              return (
                <div key={fileType} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    hasFile ? 'bg-green-500' : config.required ? 'bg-red-500' : 'bg-gray-300'
                  }`} />
                  <span className={`text-xs ${
                    hasFile ? 'text-green-700' : config.required ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* File Size Information */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">
                <strong>Uploaded:</strong> {files.length} file{files.length !== 1 ? 's' : ''}
              </span>
              <span className={`font-medium ${
                files.reduce((sum, f) => sum + f.fileSize, 0) > WARN_TOTAL_SIZE 
                  ? 'text-orange-600' 
                  : files.reduce((sum, f) => sum + f.fileSize, 0) > MAX_TOTAL_SIZE * 0.9
                    ? 'text-yellow-600'
                    : 'text-gray-600'
              }`}>
                {formatFileSize(files.reduce((sum, f) => sum + f.fileSize, 0))} / {formatFileSize(MAX_TOTAL_SIZE)}
              </span>
            </div>
            
            {/* Size Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  files.reduce((sum, f) => sum + f.fileSize, 0) > WARN_TOTAL_SIZE
                    ? 'bg-orange-500'
                    : files.reduce((sum, f) => sum + f.fileSize, 0) > MAX_TOTAL_SIZE * 0.7
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                }`}
                style={{ 
                  width: `${Math.min((files.reduce((sum, f) => sum + f.fileSize, 0) / MAX_TOTAL_SIZE) * 100, 100)}%` 
                }}
              />
            </div>

            {/* Size Warning */}
            {files.reduce((sum, f) => sum + f.fileSize, 0) > WARN_TOTAL_SIZE && (
              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                <div className="w-1 h-1 bg-orange-500 rounded-full" />
                <span>
                  Approaching size limit. Consider optimizing files for better performance.
                </span>
              </div>
            )}

            {/* Individual File Sizes (if any files uploaded) */}
            {files.length > 0 && (
              <div className="text-xs text-gray-500 space-y-1">
                <div className="font-medium">File sizes:</div>
                {files.map((file, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="truncate max-w-[200px]">
                      {FILE_TYPE_CONFIGS[file.fileType].label}: {file.fileName}
                    </span>
                    <span className={`font-mono ${
                      file.fileSize > MAX_FILE_SIZE * 0.8 ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                      {formatFileSize(file.fileSize)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-xs text-gray-500 pt-1 border-t">
              <strong>Limits:</strong> {formatFileSize(MAX_FILE_SIZE)} per file • {formatFileSize(MAX_TOTAL_SIZE)} total per script
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
