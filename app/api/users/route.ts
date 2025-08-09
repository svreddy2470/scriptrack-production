
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@/lib/types'

export const dynamic = "force-dynamic"

// GET /api/users - Fetch users with optional role filtering for assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const forAssignment = searchParams.get('forAssignment') === 'true'
    const excludeUserId = searchParams.get('excludeUserId')
    const role = searchParams.get('role') as UserRole | null

    const currentUserRole = session.user.role

    // Build the where clause
    const where: any = {
      status: 'ACTIVE'
    }

    // If requesting users for assignment, apply role-based filtering
    if (forAssignment) {
      if (currentUserRole === 'ADMIN') {
        // Admin can assign to anyone
        // No additional role restriction
      } else if (currentUserRole === 'EXECUTIVE') {
        // Executive can assign to READER, PRODUCER, EXECUTIVE
        where.role = {
          in: ['READER', 'PRODUCER', 'EXECUTIVE']
        }
      } else {
        // PRODUCER and READER cannot assign scripts
        return NextResponse.json({ error: 'Insufficient permissions to assign scripts' }, { status: 403 })
      }
    }

    // Filter by specific role if provided
    if (role) {
      where.role = role
    }

    // Exclude specific user (e.g., current user from assignment list)
    if (excludeUserId) {
      where.id = {
        not: excludeUserId
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        photoUrl: true,
        isProfileComplete: true,
        createdAt: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
