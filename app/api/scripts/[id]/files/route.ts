import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ScriptFileType } from '@/lib/types'

export const dynamic = "force-dynamic"

interface Props {
  params: { id: string }
}

// POST /api/scripts/[id]/files - Add new file to existing script
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      fileType,
      fileName,
      fileUrl,
      fileSize
    } = body

    console.log('Adding file to script:', params.id, { fileType, fileName })

    // Validate required fields
    if (!fileType || !fileName || !fileUrl || !fileSize) {
      return NextResponse.json({ error: 'Missing required file information' }, { status: 400 })
    }

    // Check if script exists and user has permission
    const existingScript = await prisma.script.findUnique({
      where: { id: params.id }
    })

    if (!existingScript) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Allow script owner or admin/executive to add files
    const isOwner = existingScript.submittedBy === session.user.id
    const isAdminOrExecutive = session.user.role === 'ADMIN' || session.user.role === 'EXECUTIVE'

    if (!isOwner && !isAdminOrExecutive) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check if file of this type already exists
    const existingFile = await prisma.scriptFile.findFirst({
      where: {
        scriptId: params.id,
        fileType: fileType as ScriptFileType,
        isLatest: true
      }
    })

    // Create new file in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If file of this type exists, mark it as not latest
      if (existingFile) {
        await tx.scriptFile.update({
          where: { id: existingFile.id },
          data: { isLatest: false }
        })
      }

      // Create new file
      const newFile = await tx.scriptFile.create({
        data: {
          scriptId: params.id,
          fileType: fileType as ScriptFileType,
          fileName,
          fileUrl,
          fileSize,
          version: existingFile ? existingFile.version + 1 : 1,
          isLatest: true,
          uploadedBy: session.user.id
        },
        include: {
          uploader: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return newFile
    })

    console.log('Successfully added file to script:', result.id)

    const serializedFile = {
      ...result,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString()
    }

    return NextResponse.json(serializedFile, { status: 201 })
  } catch (error) {
    console.error('Error adding file to script:', error)
    return NextResponse.json({ error: 'Failed to add file to script' }, { status: 500 })
  }
}
