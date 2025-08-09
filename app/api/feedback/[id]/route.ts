
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { FeedbackCategory } from '@/lib/types'

export const dynamic = "force-dynamic"

// GET /api/feedback/[id] - Get specific feedback
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedback = await prisma.feedback.findUnique({
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
        script: {
          select: {
            id: true,
            title: true,
            writers: true
          }
        },
        assignment: {
          select: {
            id: true,
            dueDate: true,
            status: true
          }
        }
      }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Check permissions
    const userRole = session.user.role || 'READER'
    const isOwner = feedback.userId === session.user.id
    const canView = ['ADMIN', 'EXECUTIVE'].includes(userRole) || isOwner || !feedback.isPrivate

    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}

// PUT /api/feedback/[id] - Update feedback
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rating, comments, category, isPrivate } = body

    // Get existing feedback
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id: params.id }
    })

    if (!existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Check permissions - only owner or admin can update
    const userRole = session.user.role
    const isOwner = existingFeedback.userId === session.user.id
    const canUpdate = userRole === 'ADMIN' || isOwner

    if (!canUpdate) {
      return NextResponse.json({ error: 'You can only update your own feedback' }, { status: 403 })
    }

    // Validate rating if provided
    if (rating !== null && rating !== undefined && (rating < 1 || rating > 10)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 10' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (rating !== undefined) updateData.rating = rating || null
    if (comments !== undefined) updateData.comments = comments
    if (category !== undefined) updateData.category = category as FeedbackCategory
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate

    // Update feedback
    const feedback = await prisma.feedback.update({
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
        script: {
          select: {
            id: true,
            title: true,
            writers: true
          }
        },
        assignment: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error updating feedback:', error)
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
  }
}

// DELETE /api/feedback/[id] - Delete feedback
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id: params.id }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Check permissions - only owner or admin can delete
    const userRole = session.user.role
    const isOwner = feedback.userId === session.user.id
    const canDelete = userRole === 'ADMIN' || isOwner

    if (!canDelete) {
      return NextResponse.json({ error: 'You can only delete your own feedback' }, { status: 403 })
    }

    // Delete the feedback
    await prisma.feedback.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Feedback deleted successfully' })
  } catch (error) {
    console.error('Error deleting feedback:', error)
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 })
  }
}
