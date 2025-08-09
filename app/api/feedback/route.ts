
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { FeedbackCategory } from '@/lib/types'

export const dynamic = "force-dynamic"

// GET /api/feedback - Fetch feedback
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scriptId = searchParams.get('scriptId')
    const assignmentId = searchParams.get('assignmentId')
    const userId = searchParams.get('userId')

    const where: any = {}

    // Filter by script
    if (scriptId) {
      where.scriptId = scriptId
    }

    // Filter by assignment
    if (assignmentId) {
      where.assignmentId = assignmentId
    }

    // Filter by user
    if (userId) {
      where.userId = userId
    }

    // Handle privacy based on user role
    const userRole = session.user.role || 'READER'
    if (!['ADMIN', 'EXECUTIVE'].includes(userRole)) {
      // Non-admin users can only see their own feedback and public feedback
      where.OR = [
        { userId: session.user.id },
        { isPrivate: false }
      ]
    }

    const feedback = await prisma.feedback.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}

// POST /api/feedback - Create new feedback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scriptId, assignmentId, rating, comments, category = 'GENERAL', isPrivate = false } = body

    // Validate required fields
    if (!scriptId || !comments) {
      return NextResponse.json({ error: 'Script ID and comments are required' }, { status: 400 })
    }

    // Validate rating if provided
    if (rating !== null && rating !== undefined && (rating < 1 || rating > 10)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 10' }, { status: 400 })
    }

    // Verify script exists
    const script = await prisma.script.findUnique({
      where: { id: scriptId }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Verify assignment exists if provided
    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      })

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
      }

      // Verify user is assigned to this assignment or can provide feedback
      const userRole = session.user.role || 'READER'
      const isAssignee = assignment.assignedTo === session.user.id
      const canProvideFeedback = ['ADMIN', 'EXECUTIVE'].includes(userRole) || isAssignee

      if (!canProvideFeedback) {
        return NextResponse.json({ error: 'You can only provide feedback on your own assignments' }, { status: 403 })
      }
    }

    // Create the feedback
    const feedback = await prisma.feedback.create({
      data: {
        scriptId,
        assignmentId: assignmentId || null,
        userId: session.user.id,
        rating: rating || null,
        comments,
        category: category as FeedbackCategory,
        isPrivate
      },
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

    // Create activity log
    await prisma.activity.create({
      data: {
        scriptId,
        userId: session.user.id,
        type: 'FEEDBACK_ADDED',
        title: 'Feedback Added',
        description: `${session.user.name} provided feedback on "${script.title}"`,
        metadata: {
          feedbackId: feedback.id,
          rating,
          category,
          assignmentId,
          isPrivate
        }
      }
    })

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
  }
}
