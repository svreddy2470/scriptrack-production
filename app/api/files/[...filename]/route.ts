
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import mime from 'mime-types'
import { Storage } from '@/lib/storage'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client for direct file serving
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'scriptrack-files'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string[] } }
) {
  try {
    const filenameArray = params.filename
    let filename = filenameArray.join('/')
    let actualFilename = filename
    
    // Handle both old and new URL formats:
    // /api/files/uploads/filename.pdf -> look in persistent-uploads/filename.pdf
    // /api/files/filename.pdf -> look in persistent-uploads/filename.pdf
    if (filenameArray[0] === 'uploads' && filenameArray.length > 1) {
      actualFilename = filenameArray.slice(1).join('/')
      console.log('File serve request (uploads format):', filename, '-> actual file:', actualFilename)
    } else {
      actualFilename = filename
      console.log('File serve request (direct format):', filename)
    }
    
    // Check if we're using S3 storage
    const isS3Configured = Storage.isCloudConfigured()
    
    if (isS3Configured) {
      // Try to serve from S3 first
      try {
        console.log('Attempting to serve from S3:', actualFilename)
        
        // The actualFilename is the S3 key path
        const s3Key = actualFilename
        
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        })

        const response = await s3Client.send(command)
        
        if (response.Body) {
          const buffer = await response.Body.transformToByteArray()
          const mimeType = response.ContentType || mime.lookup(actualFilename) || 'application/octet-stream'
          
          console.log('Successfully served from S3:', {
            key: s3Key,
            contentType: mimeType,
            size: buffer.length
          })

          return new NextResponse(buffer, {
            headers: {
              'Content-Type': mimeType,
              'Cache-Control': 'public, max-age=31536000',
              'Content-Length': buffer.length.toString(),
            },
          })
        }
      } catch (s3Error: any) {
        console.error('S3 file serve error:', {
          error: s3Error.message,
          code: s3Error.Code,
          key: filename,
          bucket: BUCKET_NAME
        })
        // Fall through to local file serving
      }
    }
    
    // Fallback to local file serving - check both persistent and legacy directories
    let filepath = join(process.cwd(), 'persistent-uploads', actualFilename)
    console.log('Attempting to serve from persistent storage:', filepath)

    if (!existsSync(filepath)) {
      // Try legacy uploads directory
      filepath = join(process.cwd(), 'uploads-backup', actualFilename)
      console.log('Fallback to legacy uploads:', filepath)
    }

    if (!existsSync(filepath)) {
      // Create a user-friendly HTML error page for missing files
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>File Not Available</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 40px 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              max-width: 600px;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .icon {
              font-size: 4rem;
              margin-bottom: 20px;
              opacity: 0.8;
            }
            h1 {
              margin: 0 0 20px 0;
              font-size: 2rem;
              font-weight: 600;
            }
            p {
              font-size: 1.1rem;
              line-height: 1.6;
              margin-bottom: 20px;
              opacity: 0.9;
            }
            .filename {
              background: rgba(255, 255, 255, 0.2);
              padding: 10px 20px;
              border-radius: 10px;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              font-size: 0.9rem;
              margin: 20px 0;
              word-break: break-all;
            }
            .actions {
              margin-top: 30px;
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background: rgba(255, 255, 255, 0.2);
              color: white;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 500;
              transition: all 0.3s ease;
              border: 1px solid rgba(255, 255, 255, 0.3);
              margin: 0 10px;
            }
            .btn:hover {
              background: rgba(255, 255, 255, 0.3);
              transform: translateY(-2px);
            }
            .note {
              font-size: 0.9rem;
              opacity: 0.7;
              margin-top: 30px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📄</div>
            <h1>File Not Available</h1>
            <p>The requested file is currently not available on the server.</p>
            <div class="filename">${filename}</div>
            <p>This usually happens when:</p>
            <ul style="text-align: left; max-width: 400px; margin: 20px auto;">
              <li>The file was lost during a server deployment</li>
              <li>The file was moved or deleted</li>
              <li>The file needs to be re-uploaded</li>
            </ul>
            <div class="actions">
              <a href="/scripts" class="btn">← Back to Scripts</a>
              <a href="/dashboard" class="btn">Go to Dashboard</a>
            </div>
            <div class="note">
              If you're the owner of this file, please re-upload it from the script management page.
            </div>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(errorHtml, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const file = await readFile(filepath)
    const mimeType = mime.lookup(actualFilename) || 'application/octet-stream'

    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    
    // Create a user-friendly HTML error page for server errors
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            text-align: center;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0 0 20px 0;
            font-size: 2rem;
            font-weight: 600;
          }
          p {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 20px;
            opacity: 0.9;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 500;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
            margin: 0 10px;
          }
          .btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Server Error</h1>
          <p>Sorry, something went wrong while trying to serve this file.</p>
          <p>Please try again later or contact support if the problem persists.</p>
          <div style="margin-top: 30px;">
            <a href="/scripts" class="btn">← Back to Scripts</a>
            <a href="/dashboard" class="btn">Go to Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
