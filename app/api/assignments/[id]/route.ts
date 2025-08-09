
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AssignmentStatus, AssignmentPriority } from '@/lib/types'

export const dynamic = "force-dynamic"

// GET /api/assignments/[id] - Get specific assignment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        script: {
          include: {
            files: {
              where: { isLatest: true }
            }
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
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Check permissions
    const userRole = session.user.role || 'READER'
    const isAssignee = assignment.assignedTo === session.user.id
    const isAssigner = assignment.assignedBy === session.user.id
    const canView = ['ADMIN', 'EXECUTIVE'].includes(userRole) || isAssignee || isAssigner

    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error fetching assignment:', error)
    return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 })
  }
}

// PUT /api/assignments/[id] - Update assignment
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
    const { status, dueDate, notes, priority } = body

    // Get existing assignment
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        script: true,
        assignee: true
      }
    })

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Check permissions
    const userRole = session.user.role || 'READER'
    const isAssignee = existingAssignment.assignedTo === session.user.id
    const isAssigner = existingAssignment.assignedBy === session.user.id
    const canUpdate = ['ADMIN', 'EXECUTIVE'].includes(userRole) || isAssigner || 
                     (isAssignee && status) // Assignees can update status

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (status !== undefined) updateData.status = status as AssignmentStatus
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (notes !== undefined) updateData.notes = notes
    if (priority !== undefined) updateData.priority = priority as AssignmentPriority

    // Update assignment
    const assignment = await prisma.assignment.update({
      where: { id: params.id },
      data: updateData,
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

    // Create activity log for status changes
    if (status && status !== existingAssignment.status) {
      await prisma.activity.create({
        data: {
          scriptId: existingAssignment.scriptId,
          userId: session.user.id,
          type: status === 'COMPLETED' ? 'ASSIGNMENT_COMPLETED' : 'STATUS_CHANGED',
          title: 'Assignment Status Updated',
          description: `Assignment status changed from ${existingAssignment.status} to ${status}`,
          metadata: {
            assignmentId: assignment.id,
            oldStatus: existingAssignment.status,
            newStatus: status,
            updatedBy: session.user.id
          }
        }
      })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }
}

// DELETE /api/assignments/[id] - Delete assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only ADMIN and EXECUTIVE can delete assignments
    if (!['ADMIN', 'EXECUTIVE'].includes(session.user.role || 'READER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        script: true,
        assignee: true
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Delete the assignment (feedback will be deleted via cascade)
    await prisma.assignment.delete({
      where: { id: params.id }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        scriptId: assignment.scriptId,
        userId: session.user.id,
        type: 'STATUS_CHANGED',
        title: 'Assignment Deleted',
        description: `Assignment for "${assignment.script.title}" removed from ${assignment.assignee.name}`,
        metadata: {
          deletedAssignmentId: params.id,
          assigneeId: assignment.assignedTo,
          assigneeName: assignment.assignee.name
        }
      }
    })

    return NextResponse.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
  }
}
