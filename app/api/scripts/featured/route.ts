
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

// GET /api/scripts/featured - Get a random featured script (non-rejected)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First try to get an explicitly featured script
    let featuredScript = await prisma.script.findFirst({
      where: {
        isFeatured: true,
        status: {
          not: 'REJECTED'
        }
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
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // If no explicitly featured script, get a random non-rejected script
    if (!featuredScript) {
      const nonRejectedScripts = await prisma.script.findMany({
        where: {
          status: {
            not: 'REJECTED'
          }
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
          }
        }
      })

      if (nonRejectedScripts.length > 0) {
        const randomIndex = Math.floor(Math.random() * nonRejectedScripts.length)
        featuredScript = nonRejectedScripts[randomIndex]
      }
    }

    if (!featuredScript) {
      return NextResponse.json({ message: 'No scripts available to feature' }, { status: 204 })
    }

    const serializedScript = {
      ...featuredScript,
      createdAt: featuredScript.createdAt.toISOString(),
      updatedAt: featuredScript.updatedAt.toISOString()
    }

    return NextResponse.json(serializedScript)
  } catch (error) {
    console.error('Error fetching featured script:', error)
    return NextResponse.json({ error: 'Failed to fetch featured script' }, { status: 500 })
  }
}

// POST /api/scripts/featured - Set a script as featured
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and executives can set featured scripts
    if (session.user.role !== 'ADMIN' && session.user.role !== 'EXECUTIVE') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { scriptId, featured } = await request.json()

    if (!scriptId) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 })
    }

    const script = await prisma.script.findUnique({
      where: { id: scriptId }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const updatedScript = await prisma.script.update({
      where: { id: scriptId },
      data: { isFeatured: featured === true },
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
    })

    const serializedScript = {
      ...updatedScript,
      createdAt: updatedScript.createdAt.toISOString(),
      updatedAt: updatedScript.updatedAt.toISOString()
    }

    return NextResponse.json(serializedScript)
  } catch (error) {
    console.error('Error setting featured script:', error)
    return NextResponse.json({ error: 'Failed to set featured script' }, { status: 500 })
  }
}
