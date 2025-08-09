import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

interface UploadResult {
  key: string
  url: string
  cdnUrl?: string
}

export class Storage {
  /**
   * Upload a file to the simple uploads directory
   */
  static async uploadFile(buffer: Buffer, fileName: string, contentType?: string): Promise<UploadResult> {
    try {
      // Simple uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads')
      
      // Ensure directory exists
      await mkdir(uploadsDir, { recursive: true, mode: 0o755 })

      // Generate unique filename
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const savedFileName = `${timestamp}_${randomSuffix}_${sanitizedFileName}`
      const filePath = path.join(uploadsDir, savedFileName)

      // Save file
      await writeFile(filePath, buffer, { mode: 0o644 })

      console.log('✅ File saved to uploads:', savedFileName)

      return {
        key: savedFileName,
        url: `/api/files/${savedFileName}`,
      }
    } catch (error) {
      console.error('File upload error:', error)
      throw new Error('Failed to upload file')
    }
  }

  /**
   * Delete a file from uploads directory
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), 'uploads', key)
      await unlink(filePath)
      console.log('✅ File deleted:', key)
    } catch (error) {
      console.error('File delete error:', error)
      // Don't throw - file might not exist
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(key: string): string {
    return `/api/files/${key}`
  }

  /**
   * Extract filename from URL
   */
  static extractKeyFromUrl(url: string): string | null {
    if (url.includes('/api/files/')) {
      return url.split('/api/files/')[1]
    }
    return null
  }

  /**
   * Cloud storage is disabled - using simple local storage
   */
  static isCloudConfigured(): boolean {
    return false
  }
}
