
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ScriptType, DevelopmentStatus, ScriptStatus, BudgetRange } from '@/lib/types'

export const dynamic = "force-dynamic"

// GET /api/scripts - Fetch all scripts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ScriptStatus | null
    const type = searchParams.get('type') as ScriptType | null
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured') === 'true'
    const userId = searchParams.get('userId')
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter by type
    if (type) {
      where.type = type
    }

    // Filter by genre
    if (genre) {
      where.genre = genre
    }

    // Filter by user (for user's own scripts)
    if (userId) {
      where.submittedBy = userId
    }

    // Filter by featured
    if (featured) {
      where.isFeatured = true
    }

    // Search functionality
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { writers: { contains: search, mode: 'insensitive' } },
        { director: { contains: search, mode: 'insensitive' } },
        { logline: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count for pagination
    const totalCount = await prisma.script.count({ where })

    const scripts = await prisma.script.findMany({
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
        files: {
          where: { isLatest: true },
          include: {
            uploader: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit
    })

    // Convert BigInt to string if any (though we don't have BigInt fields currently)
    const serializedScripts = scripts.map(script => ({
      ...script,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString()
    }))

    // Return paginated response
    return NextResponse.json({
      scripts: serializedScripts,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    })
  } catch (error) {
    console.error('Error fetching scripts:', error)
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 })
  }
}

// POST /api/scripts - Create a new script
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      writers,
      phone,
      email,
      type,
      developmentStatus,
      logline,
      synopsis,
      director,
      budgetRange,
      genre,
      subGenre,
      coverImageUrl,
      files
    } = body

    // Validation
    if (!title || !writers || !phone || !email || !type || !developmentStatus || !genre || !logline || !synopsis) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate that at least one required file type is provided
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 })
    }

    console.log('Script creation - Received files:', files.map(f => ({ fileType: f.fileType, fileName: f.fileName })))

    // Check if at least one required file type is uploaded
    const requiredFileTypes = ['SCREENPLAY', 'PITCHDECK', 'TREATMENT', 'ONELINE_ORDER']
    const hasRequiredFile = files.some(file => requiredFileTypes.includes(file.fileType))
    if (!hasRequiredFile) {
      return NextResponse.json({ error: 'At least one file is required among: Screenplay, Pitch Deck, Treatment, or One-line Order' }, { status: 400 })
    }

    // Create script and files in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the script
      const script = await tx.script.create({
        data: {
          title,
          writers,
          phone,
          email,
          type,
          developmentStatus,
          logline,
          synopsis,
          director: director || null,
          budgetRange: budgetRange || null,
          genre: genre || null,
          subGenre: subGenre || null,
          coverImageUrl: coverImageUrl || null,
          submittedBy: session.user.id,
          status: 'SUBMITTED'
        }
      })

      // Create script files
      console.log('Creating script files for script:', script.id)
      const scriptFiles = await Promise.all(
        files.map(async (file, index) => {
          console.log(`Creating file ${index + 1}:`, { 
            fileType: file.fileType, 
            fileName: file.fileName,
            fileUrl: file.fileUrl 
          })
          return tx.scriptFile.create({
            data: {
              scriptId: script.id,
              fileType: file.fileType,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              version: 1,
              isLatest: true,
              uploadedBy: session.user.id
            }
          })
        })
      )
      console.log('Successfully created script files:', scriptFiles.length)

      return {
        ...script,
        files: scriptFiles
      }
    })

    // Fetch the complete script with relationships
    const completeScript = await prisma.script.findUnique({
      where: { id: result.id },
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
        files: {
          where: { isLatest: true },
          include: {
            uploader: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Create activity log for script submission
    if (completeScript) {
      await prisma.activity.create({
        data: {
          scriptId: completeScript.id,
          userId: session.user.id,
          type: 'SCRIPT_SUBMITTED',
          title: 'Script Submitted',
          description: `New script "${title}" submitted by ${session.user.name}`,
          metadata: {
            scriptType: type,
            developmentStatus,
            writers,
            director,
            genre,
            subGenre,
            filesCount: files.length
          }
        }
      })
    }

    const serializedScript = {
      ...completeScript,
      createdAt: completeScript?.createdAt.toISOString(),
      updatedAt: completeScript?.updatedAt.toISOString()
    }

    return NextResponse.json(serializedScript, { status: 201 })
  } catch (error) {
    console.error('Error creating script:', error)
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 })
  }
}
