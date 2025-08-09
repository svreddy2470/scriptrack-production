
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

// GET /api/admin/reports - Generate comprehensive team activity report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and executives can access reports
    if (!['ADMIN', 'EXECUTIVE'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    let startDate: Date
    let endDate = new Date()

    // Calculate date range based on period
    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        const customStart = searchParams.get('startDate')
        const customEnd = searchParams.get('endDate')
        if (customStart && customEnd) {
          startDate = new Date(customStart)
          endDate = new Date(customEnd)
        } else {
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
        break
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    // Fetch all users with their activities
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        scripts: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        assignedTo: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            script: {
              select: {
                title: true
              }
            }
          }
        },
        assignedBy: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        feedback: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        activities: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    // Calculate user activity data
    const userActivityData = users.map(user => {
      const scriptsSubmitted = user.scripts.length
      const tasksCompleted = user.assignedTo.filter((task: any) => task.status === 'COMPLETED').length
      const tasksAssigned = user.assignedBy.length
      const feedbackGiven = user.feedback.length
      
      // Calculate average completion time for completed tasks
      const completedTasks = user.assignedTo.filter((task: any) => task.status === 'COMPLETED')
      const averageCompletionTime = completedTasks.length > 0 
        ? Math.round(completedTasks.reduce((acc: number, task: any) => {
            const completionTime = task.updatedAt.getTime() - task.createdAt.getTime()
            return acc + (completionTime / (1000 * 60 * 60 * 24)) // Convert to days
          }, 0) / completedTasks.length)
        : 0

      // Calculate activity score (weighted combination of activities)
      const activityScore = Math.round(
        (scriptsSubmitted * 10) +
        (tasksCompleted * 8) +
        (tasksAssigned * 5) +
        (feedbackGiven * 3)
      )

      return {
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        role: user.role,
        scriptsSubmitted,
        tasksCompleted,
        tasksAssigned,
        feedbackGiven,
        averageCompletionTime,
        activityScore,
        lastActive: user.activities[0]?.createdAt.toISOString() || user.updatedAt.toISOString()
      }
    })

    // Calculate overview stats
    const allScripts = await prisma.script.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const allAssignments = await prisma.assignment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const completedAssignments = allAssignments.filter(a => a.status === 'COMPLETED').length
    const pendingAssignments = allAssignments.filter(a => ['PENDING', 'IN_PROGRESS'].includes(a.status)).length

    const averageCompletionTime = completedAssignments > 0
      ? Math.round(allAssignments
          .filter(a => a.status === 'COMPLETED')
          .reduce((acc, assignment) => {
            const completionTime = assignment.updatedAt.getTime() - assignment.createdAt.getTime()
            return acc + (completionTime / (1000 * 60 * 60 * 24))
          }, 0) / completedAssignments)
      : 0

    const totalFeedback = await prisma.feedback.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Generate timeline data (daily activity for the period)
    const timelineData = []
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const maxDataPoints = Math.min(daysDiff, 30) // Limit to 30 data points

    for (let i = 0; i < maxDataPoints; i++) {
      const date = new Date(startDate.getTime() + (i * (daysDiff / maxDataPoints) * 24 * 60 * 60 * 1000))
      const nextDate = new Date(date.getTime() + ((daysDiff / maxDataPoints) * 24 * 60 * 60 * 1000))

      const scriptsCount = await prisma.script.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      })

      const assignmentsCount = await prisma.assignment.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      })

      const feedbackCount = await prisma.feedback.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      })

      timelineData.push({
        date: date.toISOString().split('T')[0],
        scripts: scriptsCount,
        assignments: assignmentsCount,
        feedback: feedbackCount
      })
    }

    // Calculate top performers
    const topPerformers = userActivityData
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 5)
      .map((user, index) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        score: user.activityScore,
        metric: index === 0 ? 'Highest Activity Score' : 
                index === 1 ? 'Most Scripts Submitted' :
                index === 2 ? 'Most Tasks Completed' :
                'Top Contributor'
      }))

    // Identify bottlenecks
    const bottlenecks = []

    // Check for overdue assignments
    const overdueAssignments = await prisma.assignment.count({
      where: {
        dueDate: {
          lt: new Date()
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    })

    if (overdueAssignments > 0) {
      bottlenecks.push({
        type: 'Overdue Tasks',
        description: 'Assignments past their due date',
        count: overdueAssignments,
        severity: overdueAssignments > 10 ? 'high' : overdueAssignments > 5 ? 'medium' : 'low'
      })
    }

    // Check for users with low activity
    const inactiveUsers = userActivityData.filter(user => user.activityScore < 10).length
    if (inactiveUsers > 0) {
      bottlenecks.push({
        type: 'Low Activity',
        description: 'Team members with minimal activity',
        count: inactiveUsers,
        severity: inactiveUsers > 3 ? 'high' : inactiveUsers > 1 ? 'medium' : 'low'
      })
    }

    // Check for scripts without assignments
    const unassignedScripts = await prisma.script.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        assignments: {
          none: {}
        }
      }
    })

    if (unassignedScripts > 0) {
      bottlenecks.push({
        type: 'Unassigned Scripts',
        description: 'Scripts waiting for review assignment',
        count: unassignedScripts,
        severity: unassignedScripts > 5 ? 'high' : unassignedScripts > 2 ? 'medium' : 'low'
      })
    }

    const reportData = {
      users: userActivityData,
      overview: {
        totalScripts: allScripts,
        totalAssignments: allAssignments.length,
        completedAssignments,
        pendingAssignments,
        averageCompletionTime,
        totalFeedback
      },
      timelineData,
      topPerformers,
      bottlenecks
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
