
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, imdbProfile, photoUrl } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone,
        imdbProfile: imdbProfile || null,
        photoUrl: photoUrl || null,
        isProfileComplete: true,
      },
    })

    return NextResponse.json({ 
      message: 'Profile completed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        imdbProfile: updatedUser.imdbProfile,
        photoUrl: updatedUser.photoUrl,
        isProfileComplete: updatedUser.isProfileComplete,
      }
    })
  } catch (error) {
    console.error('Profile completion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
