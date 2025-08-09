
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/lib/types'

export const dynamic = "force-dynamic"

interface Props {
  params: { id: string }
}

// GET /api/scripts/[id] - Fetch single script
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const script = await prisma.script.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            photoUrl: true
          }
        },
        files: {
          orderBy: [
            { fileType: 'asc' },
            { version: 'desc' }
          ],
          include: {
            uploader: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const serializedScript = {
      ...script,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString()
    }

    return NextResponse.json(serializedScript)
  } catch (error) {
    console.error('Error fetching script:', error)
    return NextResponse.json({ error: 'Failed to fetch script' }, { status: 500 })
  }
}

// PUT /api/scripts/[id] - Update script
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      writers,
      phone,
      email,
      type,
      developmentStatus,
      logline,
      synopsis,
      director,
      budgetRange,
      genre,
      subGenre,
      status,
      notes,
      isFeatured,
      readingProgress,
      coverImageUrl,
      files
    } = body

    // Check if script exists and user has permission
    const existingScript = await prisma.script.findUnique({
      where: { id: params.id }
    })

    if (!existingScript) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Define permission levels
    const isOwner = existingScript.submittedBy === session.user.id
    const isAdmin = session.user.role === 'ADMIN'
    const isExecutive = session.user.role === 'EXECUTIVE'
    const isProducer = session.user.role === 'PRODUCER'
    const isReader = session.user.role === 'READER'
    
    // Content editing permissions: Owners (Producers/Readers) can edit their own scripts
    const canEditContent = isOwner || isAdmin || isExecutive
    
    // Management permissions: Only Admins and Executives can manage workflow
    const canManage = isAdmin || isExecutive

    if (!canEditContent) {
      return NextResponse.json({ 
        error: 'Permission denied. You can only edit scripts you created.' 
      }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}

    // Content fields that script owners (including Producers/Readers) can edit
    if (canEditContent) {
      if (title !== undefined) updateData.title = title
      if (writers !== undefined) updateData.writers = writers
      if (phone !== undefined) updateData.phone = phone
      if (email !== undefined) updateData.email = email
      if (type !== undefined) updateData.type = type
      if (developmentStatus !== undefined) updateData.developmentStatus = developmentStatus
      if (logline !== undefined) updateData.logline = logline
      if (synopsis !== undefined) updateData.synopsis = synopsis
      if (director !== undefined) updateData.director = director
      if (budgetRange !== undefined) updateData.budgetRange = budgetRange
      if (genre !== undefined) updateData.genre = genre
      if (subGenre !== undefined) updateData.subGenre = subGenre
      if (coverImageUrl !== undefined) {
        // Handle empty strings and null values properly
        updateData.coverImageUrl = coverImageUrl === '' ? null : coverImageUrl
      }
    }

    // Management fields - only Admins and Executives can modify these
    if (canManage) {
      if (status !== undefined) updateData.status = status
      if (notes !== undefined) updateData.notes = notes
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured
      if (readingProgress !== undefined) updateData.readingProgress = readingProgress
    } else {
      // If non-management user tries to change management fields, return error
      if (status !== undefined || notes !== undefined || isFeatured !== undefined || readingProgress !== undefined) {
        return NextResponse.json({ 
          error: 'Permission denied. Only Admins and Executives can change script status, notes, featured status, or reading progress.' 
        }, { status: 403 })
      }
    }

    const updatedScript = await prisma.script.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            photoUrl: true
          }
        },
        files: {
          orderBy: [
            { fileType: 'asc' },
            { version: 'desc' }
          ],
          include: {
            uploader: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Handle files update if files array is provided
    if (files && Array.isArray(files) && files.length > 0) {
      // Validate that at least one required file type is provided
      const requiredFileTypes = ['SCREENPLAY', 'PITCHDECK', 'TREATMENT', 'ONELINE_ORDER']
      const hasRequiredFile = files.some(file => requiredFileTypes.includes(file.fileType))
      if (!hasRequiredFile) {
        return NextResponse.json({ error: 'At least one file is required among: Screenplay, Pitch Deck, Treatment, or One-line Order' }, { status: 400 })
      }

      // Mark all existing files as not latest
      await prisma.scriptFile.updateMany({
        where: { scriptId: params.id },
        data: { isLatest: false }
      })

      // Create new script files
      await Promise.all(
        files.map(async (file) => {
          // Get the next version number for this file type
          const existingFile = await prisma.scriptFile.findFirst({
            where: { 
              scriptId: params.id,
              fileType: file.fileType 
            },
            orderBy: { version: 'desc' }
          })
          
          const nextVersion = existingFile ? existingFile.version + 1 : 1

          return prisma.scriptFile.create({
            data: {
              scriptId: params.id,
              fileType: file.fileType,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              version: nextVersion,
              isLatest: true,
              uploadedBy: session.user.id
            }
          })
        })
      )
    }

    // Create activity logs for significant changes
    const activities = []

    // Status change activity
    if (status !== undefined && status !== existingScript.status) {
      activities.push({
        scriptId: params.id,
        userId: session.user.id,
        type: 'STATUS_CHANGED' as ActivityType,
        title: 'Script Status Updated',
        description: `Script status changed from ${existingScript.status} to ${status}`,
        metadata: {
          oldStatus: existingScript.status,
          newStatus: status,
          updatedBy: session.user.name
        }
      })
    }

    // Featured status change activity
    if (isFeatured !== undefined && isFeatured !== existingScript.isFeatured) {
      activities.push({
        scriptId: params.id,
        userId: session.user.id,
        type: 'SCRIPT_FEATURED' as ActivityType,
        title: isFeatured ? 'Script Featured' : 'Script Unfeatured',
        description: `Script "${existingScript.title}" ${isFeatured ? 'marked as featured' : 'removed from featured'}`,
        metadata: {
          featured: isFeatured,
          updatedBy: session.user.name || session.user.email
        }
      })
    }

    // General script edit activity (if other fields changed)
    const editableFields = ['title', 'writers', 'phone', 'email', 'type', 'developmentStatus', 'logline', 'synopsis', 'director', 'budgetRange', 'genre', 'subGenre', 'coverImageUrl', 'notes'] as const
    const hasGeneralEdits = editableFields.some(field => {
      return body[field] !== undefined && body[field] !== (existingScript as any)[field]
    })

    if (hasGeneralEdits && !activities.some(a => a.type === 'STATUS_CHANGED' || a.type === 'SCRIPT_FEATURED')) {
      activities.push({
        scriptId: params.id,
        userId: session.user.id,
        type: 'SCRIPT_EDITED' as ActivityType,
        title: 'Script Updated',
        description: `Script "${existingScript.title}" details updated by ${session.user.name || session.user.email}`,
        metadata: {
          updatedBy: session.user.name || session.user.email,
          fieldsUpdated: editableFields.filter(field => body[field] !== undefined && body[field] !== (existingScript as any)[field])
        }
      })
    }

    // Create all activities
    if (activities.length > 0) {
      await Promise.all(
        activities.map(activity => prisma.activity.create({ data: activity }))
      )
    }

    const serializedScript = {
      ...updatedScript,
      createdAt: updatedScript.createdAt.toISOString(),
      updatedAt: updatedScript.updatedAt.toISOString()
    }

    return NextResponse.json(serializedScript)
  } catch (error) {
    console.error('Error updating script:', error)
    
    // Provide more specific error information for debugging
    let errorMessage = 'Failed to update script'
    
    if (error instanceof Error) {
      // Check for common database/validation errors
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'A script with this information already exists'
      } else if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'Invalid reference in script data'
      } else if (error.message.includes('Data too long')) {
        errorMessage = 'One or more fields exceed the maximum length'
      } else if (error.message.includes('coverImageUrl')) {
        errorMessage = 'Failed to update cover image - please check the image URL or try uploading a new image'
      } else {
        // Include the actual error message for debugging (in non-production)
        errorMessage = `Update failed: ${error.message}`
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/scripts/[id] - Delete script (Admin only)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete scripts
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get script details before deletion (for logging and validation)
    const script = await prisma.script.findUnique({
      where: { id: params.id },
      include: {
        assignments: { select: { id: true } },
        feedback: { select: { id: true } },
        activities: { select: { id: true } },
        meetings: { select: { id: true } },
        files: { select: { id: true } }
      }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Count related records for logging
    const relatedCounts = {
      assignments: script.assignments.length,
      feedback: script.feedback.length,
      activities: script.activities.length,
      meetings: script.meetings.length,
      files: script.files.length
    }

    // Perform deletion in transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Log the deletion activity before deleting (will be cascade deleted with script)
      await tx.activity.create({
        data: {
          scriptId: params.id,
          userId: session.user.id,
          type: 'SCRIPT_EDITED', // Using existing type as closest match
          title: 'Script Deleted',
          description: `Script "${script.title}" was permanently deleted by admin`,
          metadata: {
            deletedBy: session.user.name || session.user.email,
            relatedRecordsDeleted: relatedCounts,
            totalRelatedRecords: Object.values(relatedCounts).reduce((a, b) => a + b, 0)
          }
        }
      })

      // Delete the script (cascade will handle all related records)
      await tx.script.delete({ where: { id: params.id } })
    })

    console.log(`🗑️ Script deleted: "${script.title}" (ID: ${params.id})`)
    console.log(`📊 Related records cascade deleted:`, relatedCounts)

    return NextResponse.json({ 
      message: 'Script and all related records deleted successfully',
      deletedScript: {
        id: script.id,
        title: script.title
      },
      relatedRecordsDeleted: relatedCounts
    })
  } catch (error) {
    console.error('❌ Error deleting script:', error)
    return NextResponse.json({ 
      error: 'Failed to delete script',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
