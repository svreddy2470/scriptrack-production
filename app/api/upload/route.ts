
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Storage } from '@/lib/storage'
import path from 'path'

export const dynamic = "force-dynamic"

// POST /api/upload - Handle file uploads for scripts and cover images with persistent storage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('Upload API - Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('Upload API - Authentication failed')
      return NextResponse.json({ 
        error: 'Authentication required. Please log in and try again.' 
      }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('type') as string // 'script' or 'cover'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size based on upload type
    const scriptFileTypes = ['screenplay', 'pitchdeck', 'treatment', 'oneline_order', 'team_profile']
    const imageFileTypes = ['cover', 'profile']
    
    console.log('Upload API - Received fileType:', fileType)
    
    if (scriptFileTypes.includes(fileType)) {
      // Script-related file validation
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ]
      
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx']
      const fileExtension = path.extname(file.name).toLowerCase()

      if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        return NextResponse.json({ 
          error: 'Invalid file type. Only PDF, DOC, DOCX, PPT, and PPTX files are allowed for script files.' 
        }, { status: 400 })
      }

      // 25MB limit for script files
      const maxSize = 25 * 1024 * 1024 // 25MB in bytes
      if (file.size > maxSize) {
        return NextResponse.json({ 
          error: 'File too large. Script files must be under 25MB.' 
        }, { status: 400 })
      }
    } else if (imageFileTypes.includes(fileType)) {
      // Cover image and profile photo validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
      const fileExtension = path.extname(file.name).toLowerCase()

      if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        return NextResponse.json({ 
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
        }, { status: 400 })
      }

      // 10MB limit for images
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > maxSize) {
        return NextResponse.json({ 
          error: 'File too large. Images must be under 10MB.' 
        }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid file type specified' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Validate that buffer is not empty
    if (!buffer || buffer.length === 0) {
      throw new Error('File buffer is empty')
    }

    // Upload to persistent storage (S3 or fallback to local)
    const uploadResult = await Storage.uploadFile(buffer, file.name, file.type)
    
    // Log storage configuration for debugging
    console.log('Storage configuration:', {
      isCloudConfigured: Storage.isCloudConfigured(),
      fileSize: file.size,
      fileName: file.name,
      uploadedUrl: uploadResult.url,
      usingS3: uploadResult.url.includes('amazonaws.com'),
      isPersistent: Storage.isCloudConfigured()
    })

    // Return file info with persistent storage URL
    const fileUrl = uploadResult.cdnUrl || uploadResult.url
    
    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileUrl,
      fileName: file.name,
      originalName: file.name,
      savedFileName: uploadResult.key,
      fileSize: file.size,
      type: fileType,
      storageKey: uploadResult.key,
      isPersistent: Storage.isCloudConfigured()
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ 
      error: 'Failed to upload file. Please try again.' 
    }, { status: 500 })
  }
}
