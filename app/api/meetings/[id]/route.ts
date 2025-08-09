

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

// GET /api/meetings/[id] - Get specific meeting
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: {
        script: {
          select: {
            id: true,
            title: true,
            writers: true,
            type: true,
            status: true,
            coverImageUrl: true
          }
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            photoUrl: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                photoUrl: true
              }
            }
          }
        }
      }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check if user has access to this meeting
    const hasAccess = meeting.scheduledBy === session.user.id || 
                     meeting.participants.some(p => p.userId === session.user.id) ||
                     ['ADMIN', 'EXECUTIVE'].includes(session.user.role || '')

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Serialize response
    const serializedMeeting = {
      ...meeting,
      scheduledAt: meeting.scheduledAt.toISOString(),
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
      participants: meeting.participants.map(participant => ({
        ...participant,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString()
      }))
    }

    return NextResponse.json(serializedMeeting)
  } catch (error) {
    console.error('Error fetching meeting:', error)
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 })
  }
}

// PUT /api/meetings/[id] - Update meeting
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: { script: true }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check permissions - only organizer, admins, or executives can update
    const canUpdate = meeting.scheduledBy === session.user.id || 
                     ['ADMIN', 'EXECUTIVE'].includes(session.user.role || '')

    if (!canUpdate) {
      return NextResponse.json({ error: 'Only meeting organizers and executives can update meetings' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, scheduledAt, status, meetingLink, location, duration, participants } = body

    // Validate scheduled time if provided
    if (scheduledAt) {
      const meetingDate = new Date(scheduledAt)
      if (meetingDate <= new Date() && !['COMPLETED', 'CANCELLED'].includes(status)) {
        return NextResponse.json({ error: 'Meeting must be scheduled for a future date and time' }, { status: 400 })
      }
    }

    // Update meeting in transaction
    const updatedMeeting = await prisma.$transaction(async (tx) => {
      // Update meeting details
      const updated = await tx.meeting.update({
        where: { id: params.id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
          ...(status && { status }),
          ...(meetingLink !== undefined && { meetingLink }),
          ...(location !== undefined && { location }),
          ...(duration !== undefined && { duration: duration ? parseInt(duration) : null })
        }
      })

      // Update participants if provided
      if (participants && Array.isArray(participants)) {
        // Remove existing participants
        await tx.meetingParticipant.deleteMany({
          where: { meetingId: params.id }
        })

        // Add new participants
        if (participants.length > 0) {
          await tx.meetingParticipant.createMany({
            data: participants.map((userId: string) => ({
              meetingId: params.id,
              userId,
              status: 'INVITED'
            }))
          })
        }
      }

      return updated
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        scriptId: meeting.scriptId,
        userId: session.user.id,
        type: 'MEETING_UPDATED',
        title: 'Meeting Updated',
        description: `Meeting "${updatedMeeting.title}" has been updated`,
        metadata: {
          meetingId: params.id,
          updatedFields: Object.keys(body),
          updatedAt: new Date().toISOString()
        }
      }
    })

    // Fetch complete updated meeting
    const completeMeeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: {
        script: {
          select: {
            id: true,
            title: true,
            writers: true,
            type: true
          }
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    })

    // Serialize response
    const serializedMeeting = {
      ...completeMeeting,
      scheduledAt: completeMeeting?.scheduledAt.toISOString(),
      createdAt: completeMeeting?.createdAt.toISOString(),
      updatedAt: completeMeeting?.updatedAt.toISOString(),
      participants: completeMeeting?.participants.map(participant => ({
        ...participant,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString()
      }))
    }

    return NextResponse.json(serializedMeeting)
  } catch (error) {
    console.error('Error updating meeting:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}

// DELETE /api/meetings/[id] - Delete meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: { script: true }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check permissions - only organizer or admins can delete
    const canDelete = meeting.scheduledBy === session.user.id || 
                     session.user.role === 'ADMIN'

    if (!canDelete) {
      return NextResponse.json({ error: 'Only meeting organizers and admins can delete meetings' }, { status: 403 })
    }

    // Delete meeting (participants will be deleted due to cascade)
    await prisma.meeting.delete({
      where: { id: params.id }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        scriptId: meeting.scriptId,
        userId: session.user.id,
        type: 'MEETING_CANCELLED',
        title: 'Meeting Cancelled',
        description: `Meeting "${meeting.title}" has been cancelled and deleted`,
        metadata: {
          meetingId: params.id,
          originalScheduledAt: meeting.scheduledAt.toISOString(),
          deletedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({ message: 'Meeting deleted successfully' })
  } catch (error) {
    console.error('Error deleting meeting:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}
