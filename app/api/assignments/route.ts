
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AssignmentStatus, AssignmentPriority } from '@/lib/types'

export const dynamic = "force-dynamic"

// GET /api/assignments - Fetch assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scriptId = searchParams.get('scriptId')
    const assignedTo = searchParams.get('assignedTo')
    const assignedBy = searchParams.get('assignedBy')
    const status = searchParams.get('status') as AssignmentStatus | null

    const where: any = {}

    // Filter by script
    if (scriptId) {
      where.scriptId = scriptId
    }

    // Filter by assignee
    if (assignedTo) {
      where.assignedTo = assignedTo
    } else if (assignedBy) {
      // Filter by who created the assignment
      where.assignedBy = assignedBy
    } else {
      // If no specific filters, show assignments based on user role
      const userRole = session.user.role
      if (userRole === 'READER' || userRole === 'PRODUCER') {
        // Show only assignments assigned to current user
        where.assignedTo = session.user.id
      }
      // ADMIN and EXECUTIVE can see all assignments
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        script: {
          select: {
            id: true,
            title: true,
            writers: true,
            type: true,
            status: true,
            coverImageUrl: true,
            logline: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            photoUrl: true
          }
        },
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        feedback: {
          select: {
            id: true,
            rating: true,
            comments: true,
            category: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

// POST /api/assignments - Create new assignment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserRole = session.user.role || 'READER'

    // Check permissions - ADMIN, EXECUTIVE, and READER can create assignments
    if (!['ADMIN', 'EXECUTIVE', 'READER'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions to create assignments' }, { status: 403 })
    }

    const body = await request.json()
    const { scriptId, assignedTo, dueDate, notes, priority = 'MEDIUM' } = body

    // Validate required fields
    if (!scriptId || !assignedTo) {
      return NextResponse.json({ error: 'Script ID and assigned user are required' }, { status: 400 })
    }

    // Verify script exists
    const script = await prisma.script.findUnique({
      where: { id: scriptId }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Verify assignee exists and check role permissions
    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo }
    })

    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
    }

    // Role-based assignment validation
    if (currentUserRole === 'EXECUTIVE' && !['READER', 'PRODUCER', 'EXECUTIVE'].includes(assignee.role)) {
      return NextResponse.json({ error: 'Executives can only assign to Readers, Producers, and other Executives' }, { status: 403 })
    }
    
    // Readers can assign to anyone (same as ADMIN level access for assignments)
    if (currentUserRole === 'READER') {
      // No additional restrictions for Readers - they can assign to any role
    }

    // Check if assignment already exists for this script and user
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        scriptId,
        assignedTo,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json({ error: 'An active assignment already exists for this script and user' }, { status: 409 })
    }

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        scriptId,
        assignedTo,
        assignedBy: session.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        priority: priority as AssignmentPriority,
        status: 'PENDING'
      },
      include: {
        script: {
          select: {
            id: true,
            title: true,
            writers: true,
            type: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assigner: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        scriptId,
        userId: session.user.id,
        type: 'ASSIGNMENT_CREATED',
        title: 'Assignment Created',
        description: `Assigned script "${script.title}" to ${assignee.name || assignee.email}`,
        metadata: {
          assignmentId: assignment.id,
          assignedTo: assignee.id,
          assigneeName: assignee.name,
          dueDate,
          priority
        }
      }
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
  }
}
