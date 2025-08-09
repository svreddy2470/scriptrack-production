export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import mime from 'mime-types'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string[] } }
) {
  try {
    const filename = params.filename.join('/')
    console.log('File serve request:', filename)
    
    // Simple path - just look in uploads directory
    const filepath = join(process.cwd(), 'uploads', filename)
    console.log('Looking for file at:', filepath)

    if (!existsSync(filepath)) {
      console.log('File not found:', filepath)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const file = await readFile(filepath)
    const mimeType = mime.lookup(filename) || 'application/octet-stream'

    console.log('✅ Successfully served file:', filename, 'type:', mimeType)

    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
