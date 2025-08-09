import { config } from 'dotenv'
config()

import { prisma } from './lib/db'

async function analyzeCoverImageData() {
  try {
    console.log('=== COVER IMAGE DATA ANALYSIS ===\n')
    
    // Get all scripts with focus on coverImageUrl patterns
    const scripts = await prisma.script.findMany({
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        createdAt: true,
        updatedAt: true,
        submittedBy: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Total Scripts: ${scripts.length}\n`)
    
    // Analyze coverImageUrl patterns
    const coverImageStats = {
      null: 0,
      empty: 0,
      apiFiles: 0,
      external: 0,
      relative: 0,
      malformed: 0,
      other: [] as string[]
    }
    
    console.log('=== INDIVIDUAL SCRIPT ANALYSIS ===')
    scripts.forEach((script, index) => {
      const url = script.coverImageUrl
      let category = 'null'
      
      if (url === null) {
        coverImageStats.null++
        category = 'NULL'
      } else if (url === '') {
        coverImageStats.empty++
        category = 'EMPTY'
      } else if (url.startsWith('/api/files/')) {
        coverImageStats.apiFiles++
        category = 'API_FILES'
      } else if (url.startsWith('http')) {
        coverImageStats.external++
        category = 'EXTERNAL'
      } else if (url.startsWith('/')) {
        coverImageStats.relative++
        category = 'RELATIVE'
      } else {
        coverImageStats.malformed++
        coverImageStats.other.push(url)
        category = 'MALFORMED'
      }
      
      console.log(`${index + 1}. [${script.id.slice(-8)}] ${script.title.substring(0, 25)}... | ${category} | ${url || 'NULL'}`)
    })
    
    console.log(`\n=== PATTERN SUMMARY ===`)
    console.log(`Null URLs: ${coverImageStats.null}`)
    console.log(`Empty URLs: ${coverImageStats.empty}`)
    console.log(`API Files URLs: ${coverImageStats.apiFiles}`)
    console.log(`External URLs: ${coverImageStats.external}`)
    console.log(`Relative URLs: ${coverImageStats.relative}`)
    console.log(`Malformed URLs: ${coverImageStats.malformed}`)
    
    if (coverImageStats.other.length > 0) {
      console.log(`\n=== MALFORMED URL EXAMPLES ===`)
      coverImageStats.other.forEach(url => console.log(`  - '${url}'`))
    }
    
    // Check for suspicious URLs (with whitespace, newlines, etc.)
    const suspiciousUrls = scripts.filter(s => 
      s.coverImageUrl && 
      (s.coverImageUrl.includes('\n') || 
       s.coverImageUrl.includes('\r') || 
       s.coverImageUrl.includes('  ') ||
       s.coverImageUrl !== s.coverImageUrl.trim() ||
       s.coverImageUrl.length > 500)
    )
    
    if (suspiciousUrls.length > 0) {
      console.log(`\n=== SUSPICIOUS URLS (whitespace/formatting) ===`)
      suspiciousUrls.forEach(s => {
        console.log(`  [${s.id.slice(-8)}] ${s.title}: '${JSON.stringify(s.coverImageUrl)}'`)
      })
    }
    
    // Recent updates
    console.log(`\n=== RECENT UPDATES (last 10) ===`)
    const recentUpdates = scripts
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
    
    recentUpdates.forEach(script => {
      const hasImage = script.coverImageUrl ? 'HAS_IMAGE' : 'NO_IMAGE'
      console.log(`  [${script.id.slice(-8)}] ${script.title.substring(0, 30)}... | ${hasImage} | ${script.updatedAt.toISOString().substring(0, 10)}`)
    })
    
  } catch (error) {
    console.error('Database analysis failed:', error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

analyzeCoverImageData().catch(console.error)
