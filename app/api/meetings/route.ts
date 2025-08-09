

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

// GET /api/meetings - Fetch meetings for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scriptId = searchParams.get('scriptId')
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    const where: any = {
      OR: [
        { scheduledBy: session.user.id }, // Meetings organized by user
        { participants: { some: { userId: session.user.id } } } // Meetings user is invited to
      ]
    }

    // Filter by script
    if (scriptId) {
      where.scriptId = scriptId
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter for upcoming meetings only
    if (upcoming) {
      where.scheduledAt = {
        gte: new Date()
      }
      where.status = {
        in: ['SCHEDULED', 'IN_PROGRESS']
      }
    }

    const meetings = await prisma.meeting.findMany({
      where,
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
      },
      orderBy: [
        { scheduledAt: 'asc' }
      ]
    })

    // Serialize dates
    const serializedMeetings = meetings.map(meeting => ({
      ...meeting,
      scheduledAt: meeting.scheduledAt.toISOString(),
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
      participants: meeting.participants.map(participant => ({
        ...participant,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString()
      }))
    }))

    return NextResponse.json(serializedMeetings)
  } catch (error) {
    console.error('Error fetching meetings:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

// POST /api/meetings - Create new meeting
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserRole = session.user.role || 'READER'

    // Check permissions - Admins, Executives, and Producers can schedule meetings
    if (!['ADMIN', 'EXECUTIVE', 'PRODUCER'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions to schedule meetings' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      scriptId, 
      title, 
      description, 
      scheduledAt, 
      participants = [], 
      meetingLink, 
      location, 
      duration 
    } = body

    // Validate required fields
    if (!scriptId || !title || !scheduledAt) {
      return NextResponse.json({ error: 'Script ID, title, and scheduled time are required' }, { status: 400 })
    }

    // Validate scheduled time is in the future
    const meetingDate = new Date(scheduledAt)
    if (meetingDate <= new Date()) {
      return NextResponse.json({ error: 'Meeting must be scheduled for a future date and time' }, { status: 400 })
    }

    // Verify script exists and user has access
    const script = await prisma.script.findUnique({
      where: { id: scriptId }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Check if user can schedule meetings for this script
    const canSchedule = currentUserRole === 'ADMIN' || 
                       currentUserRole === 'EXECUTIVE' || 
                       (currentUserRole === 'PRODUCER' && script.submittedBy === session.user.id)

    if (!canSchedule) {
      return NextResponse.json({ error: 'You can only schedule meetings for your own scripts' }, { status: 403 })
    }

    // Validate participants exist
    if (participants.length > 0) {
      const participantUsers = await prisma.user.findMany({
        where: {
          id: { in: participants }
        },
        select: { id: true, name: true, email: true }
      })

      if (participantUsers.length !== participants.length) {
        return NextResponse.json({ error: 'One or more participants not found' }, { status: 404 })
      }
    }

    // Create meeting with participants in a transaction
    const meeting = await prisma.$transaction(async (tx) => {
      // Create the meeting
      const newMeeting = await tx.meeting.create({
        data: {
          scriptId,
          title,
          description,
          scheduledAt: meetingDate,
          scheduledBy: session.user.id,
          meetingLink,
          location,
          duration: duration ? parseInt(duration) : null,
          status: 'SCHEDULED'
        }
      })

      // Add participants
      if (participants.length > 0) {
        await tx.meetingParticipant.createMany({
          data: participants.map((userId: string) => ({
            meetingId: newMeeting.id,
            userId,
            status: 'INVITED'
          }))
        })
      }

      return newMeeting
    })

    // Fetch the complete meeting with relationships
    const completeMeeting = await prisma.meeting.findUnique({
      where: { id: meeting.id },
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

    // Create activity log
    await prisma.activity.create({
      data: {
        scriptId,
        userId: session.user.id,
        type: 'MEETING_SCHEDULED',
        title: 'Meeting Scheduled',
        description: `Meeting "${title}" scheduled for ${meetingDate.toLocaleString()}`,
        metadata: {
          meetingId: meeting.id,
          scheduledAt: meetingDate.toISOString(),
          participantCount: participants.length,
          duration,
          location,
          meetingLink: meetingLink ? 'provided' : 'not provided'
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

    return NextResponse.json(serializedMeeting, { status: 201 })
  } catch (error) {
    console.error('Error creating meeting:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
