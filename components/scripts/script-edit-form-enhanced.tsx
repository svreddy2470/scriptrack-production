
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { Save, Upload, FileText, Loader2, X, Download, History, Plus } from 'lucide-react'
import { ScriptType, DevelopmentStatus, BudgetRange, Script } from '@/lib/types'
import { MultipleFileUpload } from './multiple-file-upload'
import { CoverImageUpload } from './cover-image-upload'

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 
  'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western', 'Other'
]

const SUB_GENRES = {
  'Action': ['Martial Arts', 'Superhero', 'Spy', 'Military', 'Other'],
  'Adventure': ['Survival', 'Quest', 'Exploration', 'Other'],
  'Animation': ['2D', '3D', 'Stop Motion', 'Mixed Media', 'Other'],
  'Biography': ['Historical', 'Contemporary', 'Autobiographical', 'Other'],
  'Comedy': ['Romantic Comedy', 'Dark Comedy', 'Slapstick', 'Satire', 'Parody', 'Other'],
  'Crime': ['Heist', 'Detective', 'Police Procedural', 'Gangster', 'Legal', 'Other'],
  'Documentary': ['Nature', 'Social Issues', 'Historical', 'Biography', 'Science', 'Other'],
  'Drama': ['Family Drama', 'Social Drama', 'Psychological', 'Medical', 'Legal', 'Other'],
  'Family': ['Kids', 'Teen', 'All Ages', 'Other'],
  'Fantasy': ['Epic Fantasy', 'Urban Fantasy', 'Dark Fantasy', 'Fairy Tale', 'Other'],
  'History': ['Period Drama', 'War History', 'Ancient', 'Medieval', 'Other'],
  'Horror': ['Supernatural', 'Psychological', 'Slasher', 'Zombie', 'Gothic', 'Other'],
  'Music': ['Musical', 'Concert', 'Biography', 'Other'],
  'Mystery': ['Detective', 'Cozy Mystery', 'Police Procedural', 'Other'],
  'Romance': ['Contemporary', 'Historical', 'Paranormal', 'Other'],
  'Sci-Fi': ['Space Opera', 'Dystopian', 'Time Travel', 'Cyberpunk', 'Alien', 'Other'],
  'Sport': ['Boxing', 'Football', 'Cricket', 'Olympics', 'Other'],
  'Thriller': ['Psychological', 'Political', 'Medical', 'Legal', 'Other'],
  'War': ['WWII', 'Vietnam', 'Modern Warfare', 'Historical', 'Other'],
  'Western': ['Classic', 'Modern', 'Spaghetti', 'Other'],
  'Other': ['Other']
}

interface ScriptEditFormEnhancedProps {
  script: Script
  onSuccess?: () => void
}

export function ScriptEditFormEnhanced({ script, onSuccess }: ScriptEditFormEnhancedProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    title: script.title,
    writers: script.writers,
    phone: script.phone,
    email: script.email,
    type: script.type,
    developmentStatus: script.developmentStatus,
    logline: script.logline,
    synopsis: script.synopsis,
    director: script.director || '',
    budgetRange: script.budgetRange || '' as BudgetRange,
    genre: script.genre || '',
    subGenre: script.subGenre || '',
    coverImageUrl: script.coverImageUrl || null
  })

  const [files, setFiles] = useState<Record<string, any[]>>({})
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)

  // Load existing files from script data for now (versioning will be added in future update)
  useEffect(() => {
    if (script.files) {
      const groupedFiles: Record<string, any[]> = {}
      script.files.forEach(file => {
        if (!groupedFiles[file.fileType]) {
          groupedFiles[file.fileType] = []
        }
        groupedFiles[file.fileType].push(file)
      })
      setFiles(groupedFiles)
    }
    setIsLoadingFiles(false)
  }, [script.files])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }
      
      // Clear sub-genre when genre changes
      if (field === 'genre') {
        newData.subGenre = ''
      }
      
      return newData
    })
  }

  const handleCoverImageChange = (imageUrl: string | null) => {
    setFormData(prev => ({
      ...prev,
      coverImageUrl: imageUrl
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Basic cover image URL validation - allow most common formats
      if (formData.coverImageUrl) {
        const url = formData.coverImageUrl.trim()
        if (url) {
          // Allow uploaded files, external URLs, and relative paths
          const isValidFormat = (
            url.startsWith('/api/files/') ||
            url.startsWith('http://') ||
            url.startsWith('https://') ||
            url.startsWith('/') ||
            url.startsWith('./') ||
            url.startsWith('../') ||
            // Allow common image file extensions for relative paths
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
          )
          
          if (!isValidFormat) {
            throw new Error('Please enter a valid image URL or upload an image file')
          }
        }
        // Ensure URL is properly formatted
        formData.coverImageUrl = url || null
      }

      const response = await fetch(`/api/scripts/${script.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Update failed')
      }

      toast({
        title: "Script updated successfully!",
        description: "Your script has been updated."
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/scripts/${script.id}`)
      }
    } catch (error: any) {
      console.error('Script update error:', error)
      
      // Show more specific error messages
      let errorTitle = "Update failed"
      let errorDescription = "Failed to update script. Please try again."
      
      if (error.message) {
        if (error.message.includes('cover image')) {
          errorTitle = "Cover Image Error"
          errorDescription = error.message
        } else if (error.message.includes('Update failed:')) {
          errorDescription = error.message
        } else {
          errorDescription = error.message
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = session?.user?.role === 'ADMIN'
  const isExecutive = session?.user?.role === 'EXECUTIVE'
  const canManage = isAdmin || isExecutive

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Script</h1>
          <p className="text-gray-600 mt-1">Update script information and manage files</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {script.status.toLowerCase().replace('_', ' ')}
          </Badge>
          <Badge variant="secondary">
            ID: {script.id.slice(-8)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Script Information
              </CardTitle>
              <CardDescription>
                Update the basic information about your script
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Script Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter script title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="writers">Writer(s) *</Label>
                    <Input
                      id="writers"
                      value={formData.writers}
                      onChange={(e) => handleInputChange('writers', e.target.value)}
                      placeholder="Writer name(s), separate with commas"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Your phone number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Your email address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Script Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select script type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FEATURE_FILM">Feature Film</SelectItem>
                        <SelectItem value="WEB_SERIES">Web Series</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="developmentStatus">Development Status *</Label>
                    <Select value={formData.developmentStatus} onValueChange={(value) => handleInputChange('developmentStatus', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select development status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SHOOTING_SCRIPT">Shooting Script</SelectItem>
                        <SelectItem value="FIRST_DRAFT">First Draft</SelectItem>
                        <SelectItem value="TREATMENT">Treatment</SelectItem>
                        <SelectItem value="ONE_LINE_ORDER">One-line Order</SelectItem>
                        <SelectItem value="PITCH_DECK">Pitch Deck</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="director">Director</Label>
                    <Input
                      id="director"
                      value={formData.director}
                      onChange={(e) => handleInputChange('director', e.target.value)}
                      placeholder="Director name (if attached)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budgetRange">Budget Range</Label>
                    <Select value={formData.budgetRange} onValueChange={(value) => handleInputChange('budgetRange', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDIE">Indie (Below ₹1 Cr)</SelectItem>
                        <SelectItem value="LOW">Low (₹1-3 Cr)</SelectItem>
                        <SelectItem value="MEDIUM">Medium (₹3-6 Cr)</SelectItem>
                        <SelectItem value="HIGH">High (₹7-10 Cr)</SelectItem>
                        <SelectItem value="VERY_HIGH">Very High (₹10 Cr+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre *</Label>
                    <Select value={formData.genre} onValueChange={(value) => handleInputChange('genre', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRES.map(genre => (
                          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subGenre">Sub-Genre</Label>
                    <Select 
                      value={formData.subGenre} 
                      onValueChange={(value) => handleInputChange('subGenre', value)}
                      disabled={!formData.genre}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.genre ? "Select sub-genre" : "Select genre first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.genre && SUB_GENRES[formData.genre as keyof typeof SUB_GENRES]?.map(subGenre => (
                          <SelectItem key={subGenre} value={subGenre}>{subGenre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logline">Logline *</Label>
                  <Textarea
                    id="logline"
                    value={formData.logline}
                    onChange={(e) => handleInputChange('logline', e.target.value)}
                    placeholder="A compelling one-sentence summary of your script (max 500 characters)"
                    rows={2}
                    maxLength={500}
                    required
                  />
                  <p className="text-sm text-gray-500">{formData.logline.length}/500 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="synopsis">Detailed Synopsis *</Label>
                  <Textarea
                    id="synopsis"
                    value={formData.synopsis}
                    onChange={(e) => handleInputChange('synopsis', e.target.value)}
                    placeholder="Provide a detailed synopsis of your script (recommended 500-1000 words)"
                    rows={6}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="min-w-[120px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Script
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* File Management Sidebar */}
        <div className="space-y-6">
          {/* Cover Image Upload */}
          <CoverImageUpload
            currentImageUrl={formData.coverImageUrl}
            onImageChange={handleCoverImageChange}
            disabled={loading}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                File Management
              </CardTitle>
              <CardDescription>
                Upload new files or update existing ones with versioning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFiles ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <MultipleFileUpload
                  scriptId={script.id}
                  mode="edit"
                  initialFiles={files}
                  onFilesChange={setFiles}
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => router.push(`/scripts/${script.id}`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Script Details
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => router.push('/scripts')}
              >
                <History className="w-4 h-4 mr-2" />
                Back to Scripts
              </Button>
              {canManage && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => router.push('/scripts')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Manage All Scripts
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
