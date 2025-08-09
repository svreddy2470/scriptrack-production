
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Upload, FileText, Image, Loader2, X, Save } from 'lucide-react'
import { ScriptType, DevelopmentStatus, BudgetRange, ScriptFileType } from '@/lib/types'
import { SimpleFileUpload } from './simple-file-upload'

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

interface ScriptSubmissionFormProps {
  onSuccess?: () => void
}

export function ScriptSubmissionForm({ onSuccess }: ScriptSubmissionFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    writers: '',
    phone: session?.user?.phone || '',
    email: session?.user?.email || '',
    type: '' as ScriptType,
    developmentStatus: '' as DevelopmentStatus,
    logline: '',
    synopsis: '',
    director: '',
    budgetRange: '' as BudgetRange,
    genre: '',
    subGenre: ''
  })

  const [files, setFiles] = useState<Array<{
    fileType: ScriptFileType
    fileName: string
    fileUrl: string
    fileSize: number
  }>>([])

  const handleFilesChange = (newFiles: Array<{
    fileType: ScriptFileType
    fileName: string
    fileUrl: string
    fileSize: number
  }>) => {
    setFiles(newFiles)
  }

  const [coverImage, setCoverImage] = useState<{
    file: File | null
    url: string
    name: string
  }>({
    file: null,
    url: '',
    name: ''
  })

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



  const handleCoverImageUpload = async (file: File) => {
    setUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cover')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setCoverImage({
        file,
        url: result.fileUrl,
        name: result.fileName
      })

      toast({
        title: "Cover image uploaded successfully",
        description: `${file.name} has been uploaded.`
      })
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload cover image.",
        variant: "destructive"
      })
    } finally {
      setUploadingCover(false)
    }
  }



  const removeCoverImage = () => {
    setCoverImage({ file: null, url: '', name: '' })
  }

  const validateForm = () => {
    const required = ['title', 'writers', 'phone', 'email', 'type', 'developmentStatus', 'genre', 'logline', 'synopsis']
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Validation error",
          description: `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`,
          variant: "destructive"
        })
        return false
      }
    }

    // Check if at least one required file type is uploaded
    const requiredFileTypes = ['SCREENPLAY', 'PITCHDECK', 'TREATMENT', 'ONELINE_ORDER']
    const hasRequiredFile = files.some(f => requiredFileTypes.includes(f.fileType))
    if (!hasRequiredFile) {
      toast({
        title: "Validation error",
        description: "At least one file is required among: Screenplay, Pitch Deck, Treatment, or One-line Order.",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      // Prepare files array for submission (files is already in the correct format)
      const filesList = files.map(file => ({
        fileType: file.fileType,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileSize: file.fileSize
      }))

      const submitData = {
        ...formData,
        coverImageUrl: coverImage.url || null,
        files: filesList
      }

      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed')
      }

      toast({
        title: "Script submitted successfully!",
        description: "Your script has been submitted for review."
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/scripts')
      }
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit script. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Submit New Script
        </CardTitle>
        <CardDescription>
          Fill out the form below to submit your script for review. All required fields must be completed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Required Information</h3>
            
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
          </div>

          {/* Optional Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Optional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Script Files</h3>
              <SimpleFileUpload
                initialFiles={files}
                onFilesChange={handleFilesChange}
              />
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image (JPG, PNG, WebP - Max 10MB)</Label>
              {!coverImage.url ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCoverImageUpload(file)
                    }}
                    className="hidden"
                    id="cover-upload"
                    disabled={uploadingCover}
                  />
                  <label htmlFor="cover-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      {uploadingCover ? (
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      ) : (
                        <Image className="w-8 h-8 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">
                        {uploadingCover ? 'Uploading...' : 'Click to upload cover image (optional)'}
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Image className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">{coverImage.name}</p>
                      <p className="text-xs text-blue-600">Cover image uploaded</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeCoverImage}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
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
              disabled={loading || uploadingCover}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Script'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
