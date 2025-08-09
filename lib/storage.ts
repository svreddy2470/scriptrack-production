
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { lookup } from 'mime-types'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'scriptrack-files'
const CDN_BASE_URL = process.env.CDN_BASE_URL

interface UploadResult {
  key: string
  url: string
  cdnUrl?: string
}

export class StorageService {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType?: string
  ): Promise<UploadResult> {
    try {
      // Generate unique key for the file
      const timestamp = Date.now()
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const key = `uploads/${timestamp}_${sanitizedFileName}`

      // Determine content type
      const mimeType = contentType || lookup(fileName) || 'application/octet-stream'

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
        Metadata: {
          originalName: fileName,
          uploadTimestamp: timestamp.toString(),
        },
      })

      const result = await s3Client.send(command)
      console.log('✅ File uploaded to S3:', key)

      // Generate URLs - use our API endpoint for serving files
      const apiUrl = `/api/files/${key}`
      const cdnUrl = CDN_BASE_URL ? `${CDN_BASE_URL}/${key}` : undefined

      return {
        key,
        url: apiUrl, // Use our API endpoint instead of direct S3 URL
        cdnUrl,
      }
    } catch (error: any) {
      console.error('S3 upload error:', error)
      console.error('S3 Error details:', {
        code: error?.Code,
        message: error?.message,
        statusCode: error?.$metadata?.httpStatusCode,
        bucket: BUCKET_NAME,
        region: process.env.AWS_REGION
      })
      
      // Fall back to local storage if S3 fails
      console.log('Falling back to local storage...')
      return LocalStorageService.uploadFile(buffer, fileName)
    }
  }

  /**
   * Get a signed URL for direct file access (for private files)
   */
  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })

      return await getSignedUrl(s3Client, command, { expiresIn })
    } catch (error) {
      console.error('Error generating signed URL:', error)
      throw new Error('Failed to generate file access URL')
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })

      await s3Client.send(command)
    } catch (error) {
      console.error('S3 delete error:', error)
      throw new Error('Failed to delete file from storage')
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(key: string): string {
    if (CDN_BASE_URL) {
      return `${CDN_BASE_URL}/${key}`
    }
    // Use our API endpoint to serve files securely instead of direct S3 URLs
    return `/api/files/${key}`
  }

  /**
   * Extract key from URL
   */
  static extractKeyFromUrl(url: string): string | null {
    try {
      // Handle different URL formats
      if (url.includes('/api/files/')) {
        // Legacy local file URL format
        return url.split('/api/files/')[1]
      }
      
      if (url.includes('amazonaws.com/')) {
        // S3 URL format
        return url.split('amazonaws.com/')[1]
      }
      
      if (CDN_BASE_URL && url.includes(CDN_BASE_URL)) {
        // CDN URL format
        return url.replace(CDN_BASE_URL + '/', '')
      }
      
      return null
    } catch (error) {
      console.error('Error extracting key from URL:', error)
      return null
    }
  }

  /**
   * Check if storage is properly configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
    )
  }
}

// Enhanced local storage for persistent file storage (Railway compatible)
export class LocalStorageService {
  static async uploadFile(buffer: Buffer, fileName: string): Promise<UploadResult> {
    const { writeFile, mkdir } = await import('fs/promises')
    const path = await import('path')
    
    try {
      // Railway provides persistent volumes at /app/data or use uploads in project root
      const uploadsDir = process.env.RAILWAY_VOLUME_MOUNT_PATH 
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
        : path.join(process.cwd(), 'uploads')
      
      // Ensure directory exists with proper permissions
      try {
        await mkdir(uploadsDir, { recursive: true, mode: 0o755 })
      } catch (error) {
        // Directory might already exist
      }

      // Generate unique filename with better collision resistance
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const savedFileName = `${timestamp}_${randomSuffix}_${sanitizedFileName}`
      const filePath = path.join(uploadsDir, savedFileName)

      // Save file with proper permissions
      await writeFile(filePath, buffer, { mode: 0o644 })

      console.log('✅ File saved to persistent local storage:', savedFileName)

      return {
        key: savedFileName,
        url: `/api/files/uploads/${savedFileName}`,
      }
    } catch (error) {
      console.error('Local storage error:', error)
      throw new Error('Failed to upload file to local storage')
    }
  }

  static async deleteFile(key: string): Promise<void> {
    const { unlink } = await import('fs/promises')
    const path = await import('path')
    
    try {
      // Try persistent-uploads directory first
      const persistentPath = path.join(process.cwd(), 'persistent-uploads', key)
      await unlink(persistentPath)
    } catch (error) {
      try {
        // Fallback to old uploads directory
        const legacyPath = path.join(process.cwd(), 'uploads', key)
        await unlink(legacyPath)
      } catch (fallbackError) {
        console.error('Local delete error:', error)
        // Don't throw - file might not exist
      }
    }
  }

  static getPublicUrl(key: string): string {
    return `/api/files/uploads/${key}`
  }
}

// Main storage interface that automatically chooses the right implementation
export class Storage {
  private static get service() {
    return StorageService.isConfigured() ? StorageService : LocalStorageService
  }

  static async uploadFile(buffer: Buffer, fileName: string, contentType?: string): Promise<UploadResult> {
    return this.service.uploadFile(buffer, fileName, contentType)
  }

  static async deleteFile(key: string): Promise<void> {
    return this.service.deleteFile(key)
  }

  static getPublicUrl(key: string): string {
    return this.service.getPublicUrl(key)
  }

  static extractKeyFromUrl(url: string): string | null {
    if (StorageService.isConfigured()) {
      return StorageService.extractKeyFromUrl(url)
    }
    // Local storage - extract filename from /api/files/uploads/filename or /api/files/filename
    if (url.includes('/api/files/uploads/')) {
      return url.split('/api/files/uploads/')[1]
    } else if (url.includes('/api/files/')) {
      return url.split('/api/files/')[1]
    }
    return null
  }

  static isCloudConfigured(): boolean {
    return StorageService.isConfigured()
  }
}
