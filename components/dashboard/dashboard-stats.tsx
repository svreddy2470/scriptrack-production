
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, CheckCircle, Clock, MessageSquare, AlertTriangle, UserCheck, TrendingUp } from 'lucide-react'
import { ScriptStatus } from '@/lib/types'
import { motion } from 'framer-motion'

interface ScriptStats {
  totalScripts: number
  statusCounts: Record<string, number>
  typeCounts: Record<string, number>
  recentScripts: any[]
}

export function DashboardStats() {
  const { data: session } = useSession()
  const [scriptStats, setScriptStats] = useState<ScriptStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScriptStats()
  }, [session?.user?.id])

  const fetchScriptStats = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/scripts/stats')
      if (response.ok) {
        const data = await response.json()
        setScriptStats(data)
      }
    } catch (error) {
      console.error('Error fetching script stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Movie-themed status configuration for all 8 script statuses
  const statusConfig = {
    SUBMITTED: {
      title: '📝 Scripts Submitted',
      icon: '📝',
      gradient: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700',
      description: 'Fresh submissions awaiting review',
      filmTerm: 'Opening Night!'
    },
    READING: {
      title: '👀 Under Review',
      icon: '👀',
      gradient: 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600',
      description: 'Currently being read and analyzed',
      filmTerm: 'Lights, Camera, Read!'
    },
    CONSIDERED: {
      title: '🎭 In Consideration',
      icon: '🎭',
      gradient: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700',
      description: 'Scripts under serious consideration',
      filmTerm: 'The Plot Thickens!'
    },
    DEVELOPMENT: {
      title: '🛠️ In Development',
      icon: '🛠️',
      gradient: 'bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-700',
      description: 'Being refined for production',
      filmTerm: 'Pre-Production Magic!'
    },
    GREENLIT: {
      title: '✅ Greenlit',
      icon: '✅',
      gradient: 'bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700',
      description: 'Approved and ready to roll',
      filmTerm: 'Green Light Go!'
    },
    IN_PRODUCTION: {
      title: '🎬 In Production',
      icon: '🎬',
      gradient: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
      description: 'Currently being filmed',
      filmTerm: 'Action!'
    },
    ON_HOLD: {
      title: '⏸️ On Hold',
      icon: '⏸️',
      gradient: 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600',
      description: 'Production temporarily paused',
      filmTerm: 'Intermission...'
    },
    REJECTED: {
      title: '❌ Not Selected',
      icon: '❌',
      gradient: 'bg-gradient-to-br from-red-500 via-pink-600 to-rose-700',
      description: 'Did not meet current criteria',
      filmTerm: 'Cut!'
    }
  }

  // Create stats array for all 8 statuses
  const stats = Object.entries(statusConfig).map(([status, config]) => ({
    ...config,
    value: scriptStats?.statusCounts?.[status] || 0,
    textColor: 'text-white',
    link: `/scripts?status=${status}`,
    status: status as ScriptStatus
  }))

  if (loading) {
    const loadingGradients = [
      'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700',
      'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600',
      'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700',
      'bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-700',
      'bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700',
      'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
      'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600',
      'bg-gradient-to-br from-red-500 via-pink-600 to-rose-700'
    ]

    const loadingIcons = ['📝', '👀', '🎭', '🛠️', '✅', '🎬', '⏸️', '❌']

    return (
      <div className="space-y-8">
        {/* Movie-themed loading message */}
        <div className="text-center">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-2"
          >
            🎬 Loading Your Script Status Dashboard... 🎬
          </motion.h2>
          <p className="text-gray-600">Getting your scripts ready for the spotlight!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className={`${loadingGradients[i]} animate-pulse border-0 overflow-hidden`}>
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="h-4 bg-white/30 rounded w-32 animate-pulse" />
                    <div className="h-10 bg-white/50 rounded w-16 animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-3 bg-white/30 rounded w-24 animate-pulse" />
                      <div className="h-3 bg-white/20 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-5xl opacity-30 animate-bounce">
                    {loadingIcons[i]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Movie-themed welcome message */}
      <div className="text-center">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-2"
        >
          🎬 Action! Your Script Status Dashboard 🎬
        </motion.h2>
        <p className="text-gray-600">Lights, camera, script management! Here's your complete production pipeline</p>
      </div>

      {/* All 8 Script Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.status}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
          >
            <Link href={stat.link}>
              <Card className={`${stat.gradient} hover:shadow-2xl hover:shadow-black/25 transition-all duration-500 group cursor-pointer border-0 overflow-hidden hover:scale-105 transform`}>
                <CardContent className="p-6 relative">
                  {/* Overlay for better text contrast */}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-500" />
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <p className={`text-sm font-semibold ${stat.textColor} opacity-90 group-hover:opacity-100 transition-opacity`}>
                          {stat.title}
                        </p>
                      </div>
                      
                      <div className={`text-4xl font-bold ${stat.textColor} group-hover:scale-110 transition-transform duration-300`}>
                        {stat.value}
                      </div>
                      
                      <div className="space-y-1">
                        <p className={`text-xs ${stat.textColor} opacity-80 font-medium`}>
                          {stat.description}
                        </p>
                        <p className={`text-xs ${stat.textColor} opacity-70 italic`}>
                          "{stat.filmTerm}"
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-5xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 opacity-80 group-hover:opacity-100">
                      {stat.icon}
                    </div>
                  </div>

                  {/* Animated sparkle effect */}
                  <div className="absolute top-4 right-4 text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse">
                    ✨
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-gradient-to-br from-slate-600 via-gray-700 to-zinc-800 hover:shadow-2xl hover:shadow-gray-500/25 transition-all duration-500 group cursor-pointer border-0 overflow-hidden hover:scale-105 transform">
            <CardContent className="p-6 relative">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-500" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl">🎪</span>
                    <p className="text-sm font-semibold text-white opacity-90 group-hover:opacity-100">
                      🎪 Total Scripts
                    </p>
                  </div>
                  <div className="text-4xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
                    {scriptStats?.totalScripts || 0}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white opacity-80 font-medium">
                      Complete script library
                    </p>
                    <p className="text-xs text-white opacity-70 italic">
                      "The Entire Archive!"
                    </p>
                  </div>
                </div>
                <div className="text-5xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 opacity-80 group-hover:opacity-100">
                  🎪
                </div>
              </div>
              <div className="absolute top-4 right-4 text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse">
                🌟
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Link href="/scripts">
            <Card className="bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-800 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 group cursor-pointer border-0 overflow-hidden hover:scale-105 transform">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-500" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-3xl">📚</span>
                      <p className="text-sm font-semibold text-white opacity-90 group-hover:opacity-100">
                        📚 View All Scripts
                      </p>
                    </div>
                    <div className="text-lg font-bold text-white group-hover:scale-110 transition-transform duration-300">
                      Browse Library
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white opacity-80 font-medium">
                        Explore the complete collection
                      </p>
                      <p className="text-xs text-white opacity-70 italic">
                        "Behind the Scenes!"
                      </p>
                    </div>
                  </div>
                  <div className="text-5xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 opacity-80 group-hover:opacity-100">
                    📚
                  </div>
                </div>
                <div className="absolute top-4 right-4 text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse">
                  🎬
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Link href="/team">
            <Card className="bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 hover:shadow-2xl hover:shadow-teal-500/25 transition-all duration-500 group cursor-pointer border-0 overflow-hidden hover:scale-105 transform">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-500" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-3xl">👥</span>
                      <p className="text-sm font-semibold text-white opacity-90 group-hover:opacity-100">
                        👥 View Team
                      </p>
                    </div>
                    <div className="text-lg font-bold text-white group-hover:scale-110 transition-transform duration-300">
                      Cast & Crew
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white opacity-80 font-medium">
                        Meet the production team
                      </p>
                      <p className="text-xs text-white opacity-70 italic">
                        "All Stars!"
                      </p>
                    </div>
                  </div>
                  <div className="text-5xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 opacity-80 group-hover:opacity-100">
                    👥
                  </div>
                </div>
                <div className="absolute top-4 right-4 text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse">
                  🏆
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
