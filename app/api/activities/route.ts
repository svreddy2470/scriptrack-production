
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/lib/types'

export const dynamic = "force-dynamic"

// GET /api/activities - Fetch activities (timeline/history)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scriptId = searchParams.get('scriptId')
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') as ActivityType | null
    const limit = searchParams.get('limit') || '50'
    const dateFrom = searchParams.get('dateFrom')

    const where: any = {}

    // Filter by script
    if (scriptId) {
      where.scriptId = scriptId
    }

    // Filter by user
    if (userId) {
      where.userId = userId
    }

    // Filter by activity type
    if (type) {
      where.type = type
    }

    // Filter by date range
    if (dateFrom) {
      where.createdAt = {
        gte: new Date(dateFrom)
      }
    }

    const activities = await prisma.activity.findMany({
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
            writers: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

// POST /api/activities - Create new activity (for manual logging)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scriptId, type, title, description, metadata } = body

    // Validate required fields
    if (!scriptId || !type || !title) {
      return NextResponse.json({ error: 'Script ID, type, and title are required' }, { status: 400 })
    }

    // Verify script exists
    const script = await prisma.script.findUnique({
      where: { id: scriptId }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Create the activity
    const activity = await prisma.activity.create({
      data: {
        scriptId,
        userId: session.user.id,
        type: type as ActivityType,
        title,
        description,
        metadata
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
            writers: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}
