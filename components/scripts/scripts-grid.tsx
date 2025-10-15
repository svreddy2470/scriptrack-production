
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScriptCard } from './script-card'
import { Script, ScriptStatus, ScriptType } from '@/lib/types'
import { Search, Plus, Filter, Star, Grid, List, User, Film, Tv, Calendar, FileText, Eye, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from '@/hooks/use-toast'

interface User {
  id: string
  name: string
  email: string
  role: string
}

export function ScriptsGrid() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [scripts, setScripts] = useState<Script[]>([])
  const [featuredScript, setFeaturedScript] = useState<Script | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScriptStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<ScriptType | 'ALL'>('ALL')
  const [genreFilter, setGenreFilter] = useState<string | 'ALL'>('ALL')
  const [userFilter, setUserFilter] = useState<string | 'ALL'>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const scriptsPerSection = 4

  const canSubmit = session?.user?.role !== 'READER'
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'EXECUTIVE'

  const statusOrder: ScriptStatus[] = [
    'SUBMITTED',
    'READING', 
    'CONSIDERED',
    'DEVELOPMENT',
    'GREENLIT',
    'IN_PRODUCTION',
    'ON_HOLD',
    'REJECTED'
  ]

  const statusLabels = {
    SUBMITTED: 'Submitted',
    READING: 'Reading',
    CONSIDERED: 'Considered',
    DEVELOPMENT: 'Development',
    GREENLIT: 'Greenlit',
    IN_PRODUCTION: 'In Production',
    ON_HOLD: 'On Hold',
    REJECTED: 'Rejected'
  }

  const statusColors = {
    SUBMITTED: 'bg-blue-500',
    READING: 'bg-yellow-500',
    CONSIDERED: 'bg-purple-500',
    DEVELOPMENT: 'bg-indigo-500',
    GREENLIT: 'bg-green-500',
    IN_PRODUCTION: 'bg-emerald-500',
    ON_HOLD: 'bg-orange-500',
    REJECTED: 'bg-red-500'
  }

  const genres = [
    'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 
    'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 
    'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western', 'Other'
  ]

  // Handle URL parameters on initial load
  useEffect(() => {
    const urlUserId = searchParams.get('userId')
    const urlStatus = searchParams.get('status')
    const urlSearch = searchParams.get('search')
    
    if (urlUserId) setUserFilter(urlUserId)
    if (urlStatus) setStatusFilter(urlStatus as ScriptStatus)
    if (urlSearch) {
      setSearchTerm(urlSearch)
      setDebouncedSearchTerm(urlSearch)
    }
  }, [searchParams])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Main data fetching effect
  useEffect(() => {
    fetchScripts()
    fetchFeaturedScript()
    if (canManage) {
      fetchUsers()
    }
  }, [debouncedSearchTerm, statusFilter, typeFilter, genreFilter, userFilter])
/*
  const fetchScripts = async () => {
    try {
      if (debouncedSearchTerm !== searchTerm) {
        setSearchLoading(true)
      }
      
      const params = new URLSearchParams()
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter !== 'ALL') params.append('type', typeFilter)
      if (genreFilter !== 'ALL') params.append('genre', genreFilter)
      if (userFilter !== 'ALL') params.append('userId', userFilter)
      
      const response = await fetch(`/api/scripts?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch scripts')
      
      const data = await response.json()
      if (data.scripts) {
        // API returns paginated response, but we want all scripts
        setScripts(data.scripts)
      } else {
        // Fallback for non-paginated response
        setScripts(data)
      }
    } catch (error) {
      console.error('Error fetching scripts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch scripts. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }
*/

  // Enhanced fetchScripts function with multiple fallback strategies
const fetchScripts = async () => {
  try {
    if (debouncedSearchTerm !== searchTerm) {
      setSearchLoading(true)
    }
    
    // Strategy 1: Try to get all scripts with high limit
    let scripts = await fetchScriptsStrategy1()
    
    // Strategy 2: If Strategy 1 fails or returns empty, try pagination
    if (!scripts || scripts.length === 0) {
      console.log('Strategy 1 failed, trying Strategy 2 (pagination)')
      scripts = await fetchScriptsStrategy2()
    }
    
    // Strategy 3: If both fail, try without pagination parameters
    if (!scripts || scripts.length === 0) {
      console.log('Strategy 2 failed, trying Strategy 3 (no pagination)')
      scripts = await fetchScriptsStrategy3()
    }
    
    // Strategy 4: Last resort - try different API endpoint
    if (!scripts || scripts.length === 0) {
      console.log('Strategy 3 failed, trying Strategy 4 (alternative endpoint)')
      scripts = await fetchScriptsStrategy4()
    }
    
    setScripts(scripts || [])
    
    // Log success for debugging
    console.log(`Successfully fetched ${scripts?.length || 0} scripts`)
    
  } catch (error) {
    console.error('All fetch strategies failed:', error)
    toast({
      title: "Error",
      description: "Failed to fetch scripts. Please try refreshing the page.",
      variant: "destructive"
    })
    setScripts([])
  } finally {
    setLoading(false)
    setSearchLoading(false)
  }
}

// Strategy 1: High limit approach
const fetchScriptsStrategy1 = async () => {
  try {
    const params = new URLSearchParams()
    if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
    if (statusFilter !== 'ALL') params.append('status', statusFilter)
    if (typeFilter !== 'ALL') params.append('type', typeFilter)
    if (genreFilter !== 'ALL') params.append('genre', genreFilter)
    if (userFilter !== 'ALL') params.append('userId', userFilter)
    
    // Try with high limit
    params.append('limit', '1000')
    params.append('page', '1')
    
    const response = await fetch(`/api/scripts?${params.toString()}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    return extractScriptsFromResponse(data)
  } catch (error) {
    console.error('Strategy 1 failed:', error)
    return null
  }
}

// Strategy 2: Proper pagination (fetch all pages)
const fetchScriptsStrategy2 = async () => {
  try {
    let allScripts = []
    let page = 1
    let hasMore = true
    const maxPages = 50 // Safety limit
    
    while (hasMore && page <= maxPages) {
      const params = new URLSearchParams()
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter !== 'ALL') params.append('type', typeFilter)
      if (genreFilter !== 'ALL') params.append('genre', genreFilter)
      if (userFilter !== 'ALL') params.append('userId', userFilter)
      params.append('page', page.toString())
      params.append('limit', '50')
      
      const response = await fetch(`/api/scripts?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      const pageScripts = extractScriptsFromResponse(data)
      
      if (pageScripts && pageScripts.length > 0) {
        allScripts = [...allScripts, ...pageScripts]
        hasMore = pageScripts.length === 50
      } else {
        hasMore = false
      }
      
      page++
    }
    
    return allScripts.length > 0 ? allScripts : null
  } catch (error) {
    console.error('Strategy 2 failed:', error)
    return null
  }
}

// Strategy 3: No pagination parameters (original approach)
const fetchScriptsStrategy3 = async () => {
  try {
    const params = new URLSearchParams()
    if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
    if (statusFilter !== 'ALL') params.append('status', statusFilter)
    if (typeFilter !== 'ALL') params.append('type', typeFilter)
    if (genreFilter !== 'ALL') params.append('genre', genreFilter)
    if (userFilter !== 'ALL') params.append('userId', userFilter)
    
    // No pagination parameters
    const response = await fetch(`/api/scripts?${params.toString()}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    return extractScriptsFromResponse(data)
  } catch (error) {
    console.error('Strategy 3 failed:', error)
    return null
  }
}

// Strategy 4: Alternative endpoint or different approach
const fetchScriptsStrategy4 = async () => {
  try {
    // Try alternative endpoints
    const endpoints = ['/api/scripts/all', '/api/admin/scripts', '/api/scripts']
    
    for (const endpoint of endpoints) {
      try {
        const params = new URLSearchParams()
        if (debouncedSearchTerm) params.append('q', debouncedSearchTerm) // Different param name
        
        const response = await fetch(`${endpoint}?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          const scripts = extractScriptsFromResponse(data)
          if (scripts && scripts.length > 0) {
            return scripts
          }
        }
      } catch (endpointError) {
        console.error(`Endpoint ${endpoint} failed:`, endpointError)
        continue
      }
    }
    
    return null
  } catch (error) {
    console.error('Strategy 4 failed:', error)
    return null
  }
}

// Helper function to extract scripts from different response formats
const extractScriptsFromResponse = (data) => {
  if (!data) return null
  
  // Try different response formats
  if (data.scripts && Array.isArray(data.scripts)) {
    return data.scripts
  } else if (Array.isArray(data)) {
    return data
  } else if (data.data && Array.isArray(data.data)) {
    return data.data
  } else if (data.results && Array.isArray(data.results)) {
    return data.results
  } else if (data.items && Array.isArray(data.items)) {
    return data.items
  }
  
  console.warn('Unknown response format:', data)
  return null
}

// Add retry mechanism for network failures
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
      
      // If it's a server error, retry
      if (response.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
        continue
      }
      
      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}

// Enhanced error handling with user-friendly messages
const handleFetchError = (error, strategy) => {
  console.error(`Fetch strategy ${strategy} failed:`, error)
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    toast({
      title: "Network Error",
      description: "Please check your internet connection and try again.",
      variant: "destructive"
    })
  } else if (error.message.includes('HTTP 401')) {
    toast({
      title: "Authentication Error",
      description: "Please log in again to continue.",
      variant: "destructive"
    })
  } else if (error.message.includes('HTTP 403')) {
    toast({
      title: "Permission Error",
      description: "You don't have permission to view these scripts.",
      variant: "destructive"
    })
  } else {
    toast({
      title: "Error",
      description: `Failed to load scripts (Strategy ${strategy}). Trying alternative method...`,
      variant: "destructive"
    })
  }
}
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchFeaturedScript = async () => {
    try {
      const response = await fetch('/api/scripts/featured')
      if (response.ok) {
        const data = await response.json()
        setFeaturedScript(data)
      }
    } catch (error) {
      console.error('Error fetching featured script:', error)
    }
  }

  // Toggle expanded sections
  const toggleSection = (status: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(status)) {
        newSet.delete(status)
      } else {
        newSet.add(status)
      }
      return newSet
    })
  }

  const handleStatusChange = async (scriptId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')

      toast({
        title: "Status updated",
        description: "Script status has been updated successfully."
      })

      fetchScripts() // Refresh the scripts
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update script status.",
        variant: "destructive"
      })
    }
  }

  const handleFeatureToggle = async (scriptId: string, featured: boolean) => {
    try {
      const response = await fetch('/api/scripts/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, featured })
      })

      if (!response.ok) throw new Error('Failed to toggle featured status')

      toast({
        title: featured ? "Script featured" : "Removed from featured",
        description: featured ? "Script has been marked as featured." : "Script removed from featured."
      })

      fetchScripts()
      if (featured) fetchFeaturedScript()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update featured status.",
        variant: "destructive"
      })
    }
  }

  // Group scripts by status for display
  const groupedScripts = statusOrder.reduce((acc, status) => {
    acc[status] = scripts.filter(script => script.status === status)
    return acc
  }, {} as Record<ScriptStatus, Script[]>)

  if (loading && scripts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-gray-600">Loading scripts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Scripts
            {userFilter !== 'ALL' && userFilter && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                - My Submissions
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            {scripts.length > 0 ? (
              <>
                {scripts.length} script{scripts.length !== 1 ? 's' : ''} found
              </>
            ) : (
              'No scripts found'
            )}
            {searchLoading && (
              <Loader2 className="w-4 h-4 animate-spin inline-block ml-2" />
            )}
          </p>
        </div>
        {canSubmit && (
          <Link href="/scripts/submit">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Submit Script
            </Button>
          </Link>
        )}
      </div>

      {/* Featured Script */}
      {featuredScript && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200"
        >
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <h2 className="text-xl font-semibold text-gray-900">Featured Script</h2>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Cover Image */}
            <div className="lg:w-48 lg:flex-shrink-0">
              <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                {featuredScript.coverImageUrl ? (
                  <Image
                    src={featuredScript.coverImageUrl}
                    alt={`${featuredScript.title} cover`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {featuredScript.type === 'FEATURE_FILM' ? (
                      <Film className="w-16 h-16 text-gray-400" />
                    ) : (
                      <Tv className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <Badge className={`${
                    featuredScript.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                    featuredScript.status === 'READING' ? 'bg-yellow-100 text-yellow-800' :
                    featuredScript.status === 'CONSIDERED' ? 'bg-purple-100 text-purple-800' :
                    featuredScript.status === 'DEVELOPMENT' ? 'bg-indigo-100 text-indigo-800' :
                    featuredScript.status === 'GREENLIT' ? 'bg-green-100 text-green-800' :
                    featuredScript.status === 'IN_PRODUCTION' ? 'bg-emerald-100 text-emerald-800' :
                    featuredScript.status === 'ON_HOLD' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  } font-medium`}>
                    {featuredScript.status === 'SUBMITTED' ? 'Submitted' :
                     featuredScript.status === 'READING' ? 'Reading' :
                     featuredScript.status === 'CONSIDERED' ? 'Considered' :
                     featuredScript.status === 'DEVELOPMENT' ? 'Development' :
                     featuredScript.status === 'GREENLIT' ? 'Greenlit' :
                     featuredScript.status === 'IN_PRODUCTION' ? 'In Production' :
                     featuredScript.status === 'ON_HOLD' ? 'On Hold' :
                     'Rejected'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Script Details */}
            <div className="flex-1 space-y-4">
              <div>
                <Link href={`/scripts/${featuredScript.id}`}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                    {featuredScript.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <User className="w-4 h-4" />
                  <span>By {featuredScript.writers}</span>
                </div>
                {featuredScript.director && (
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Film className="w-4 h-4" />
                    <span>Directed by {featuredScript.director}</span>
                  </div>
                )}
              </div>

              <p className="text-lg text-gray-800 leading-relaxed">{featuredScript.logline}</p>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  {featuredScript.type === 'FEATURE_FILM' ? (
                    <><Film className="w-3 h-3" />Feature Film</>
                  ) : (
                    <><Tv className="w-3 h-3" />Web Series</>
                  )}
                </Badge>
                {featuredScript.budgetRange && (
                  <Badge variant="outline">
                    {featuredScript.budgetRange === 'INDIE' && 'Indie Budget (Below ₹1 Cr)'}
                    {featuredScript.budgetRange === 'LOW' && 'Low Budget (₹1-3 Cr)'}
                    {featuredScript.budgetRange === 'MEDIUM' && 'Medium Budget (₹3-6 Cr)'}
                    {featuredScript.budgetRange === 'HIGH' && 'High Budget (₹7-10 Cr)'}
                    {featuredScript.budgetRange === 'VERY_HIGH' && 'Very High Budget (₹10 Cr+)'}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Submitted {new Date(featuredScript.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {featuredScript.files?.length || 0} file{(featuredScript.files?.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="flex gap-3">
                <Link href={`/scripts/${featuredScript.id}`}>
                  <Button className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </Link>
                {canManage && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleFeatureToggle(featuredScript.id, false)}
                    className="flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Remove Featured
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search scripts by title, writer, or logline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
          )}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ScriptStatus | 'ALL')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {statusOrder.map(status => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ScriptType | 'ALL')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="FEATURE_FILM">Feature Film</SelectItem>
              <SelectItem value="WEB_SERIES">Web Series</SelectItem>
            </SelectContent>
          </Select>

          <Select value={genreFilter} onValueChange={(value) => setGenreFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Genres</SelectItem>
              {genres.map(genre => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(canManage || userFilter !== 'ALL') && (
            <Select value={userFilter} onValueChange={(value) => setUserFilter(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scripts Grid by Status - Expandable Sections */}
      <div className="space-y-8">
        {statusOrder.map(status => {
          const statusScripts = groupedScripts[status]
          if (statusScripts.length === 0) return null

          const isExpanded = expandedSections.has(status)
          const displayedScripts = isExpanded ? statusScripts : statusScripts.slice(0, scriptsPerSection)
          const hasMore = statusScripts.length > scriptsPerSection

          return (
            <motion.div
              key={status}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                  <h2 className="text-xl font-semibold text-gray-900">
                    {statusLabels[status]}
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {statusScripts.length}
                  </Badge>
                </div>
                
                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection(status)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    {isExpanded ? (
                      <>
                        Show Less
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        View More ({statusScripts.length - scriptsPerSection} more)
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }>
                <AnimatePresence>
                  {displayedScripts.map((script, index) => (
                    <motion.div
                      key={script.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ScriptCard 
                        script={script}
                        onStatusChange={canManage ? handleStatusChange : undefined}
                        onFeatureToggle={canManage ? handleFeatureToggle : undefined}
                        viewMode={viewMode}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </div>



      {/* Empty State */}
      {scripts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scripts found</h3>
          <p className="text-gray-600 mb-4">
            {debouncedSearchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' || genreFilter !== 'ALL' || userFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filters.'
              : 'Be the first to submit a script!'
            }
          </p>
          {canSubmit && !userFilter && (
            <Link href="/scripts/submit">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Submit First Script
              </Button>
            </Link>
          )}
          {userFilter !== 'ALL' && userFilter && (
            <Link href="/scripts/submit">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Submit Your First Script
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
