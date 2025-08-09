
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

// GET /api/scripts/stats - Get script statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts by status
    const statusCounts = await prisma.script.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    // Get total scripts count
    const totalScripts = await prisma.script.count()

    // Get scripts by type
    const typeCounts = await prisma.script.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    })

    // Get recent scripts
    const recentScripts = await prisma.script.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        writers: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    const serializedRecentScripts = recentScripts.map(script => ({
      ...script,
      createdAt: script.createdAt.toISOString()
    }))

    const stats = {
      totalScripts,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id
        return acc
      }, {} as Record<string, number>),
      typeCounts: typeCounts.reduce((acc, item) => {
        acc[item.type] = item._count.id
        return acc
      }, {} as Record<string, number>),
      recentScripts: serializedRecentScripts
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching script stats:', error)
    return NextResponse.json({ error: 'Failed to fetch script stats' }, { status: 500 })
  }
}
