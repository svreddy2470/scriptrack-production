

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

// GET /api/scripts/[id]/meetings - Get meetings for specific script
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    // Verify script exists
    const script = await prisma.script.findUnique({
      where: { id: params.id }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const where: any = {
      scriptId: params.id
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
    console.error('Error fetching script meetings:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings for script' }, { status: 500 })
  }
}
