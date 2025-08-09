import { prisma } from './lib/db'

async function debugFileIssues() {
  try {
    console.log('=== DATABASE ANALYSIS ===')
    
    // Check all scripts and their files
    const scripts = await prisma.script.findMany({
      include: {
        files: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\nTotal scripts: ${scripts.length}`)
    
    // Analyze file types distribution
    const fileTypeCount: Record<string, number> = {}
    let totalFiles = 0
    
    scripts.forEach(script => {
      console.log(`\nScript: "${script.title}" (ID: ${script.id})`)
      console.log(`  Files: ${script.files.length}`)
      
      script.files.forEach(file => {
        console.log(`    - ${file.fileType}: ${file.fileName} (${file.fileSize} bytes)`)
        fileTypeCount[file.fileType] = (fileTypeCount[file.fileType] || 0) + 1
        totalFiles++
      })
      
      if (script.files.length === 0) {
        console.log(`    ❌ PROBLEM: Script has NO files!`)
      }
    })
    
    console.log('\n=== FILE TYPE DISTRIBUTION ===')
    Object.entries(fileTypeCount).forEach(([type, count]) => {
      console.log(`${type}: ${count} files`)
    })
    
    console.log(`\nTotal files across all scripts: ${totalFiles}`)
    
    // Check for scripts with missing required files
    console.log('\n=== MISSING SCREENPLAY FILES ===')
    const scriptsWithoutScreenplay = scripts.filter(script => 
      !script.files.some(file => file.fileType === 'SCREENPLAY')
    )
    
    scriptsWithoutScreenplay.forEach(script => {
      console.log(`❌ "${script.title}" has no SCREENPLAY file`)
    })
    
    // Check for scripts with Pitchdeck or Treatment files
    console.log('\n=== PITCHDECK & TREATMENT STATUS ===')
    const scriptsWithPitchdeck = scripts.filter(script => 
      script.files.some(file => file.fileType === 'PITCHDECK')
    )
    const scriptsWithTreatment = scripts.filter(script => 
      script.files.some(file => file.fileType === 'TREATMENT')
    )
    
    console.log(`Scripts with PITCHDECK: ${scriptsWithPitchdeck.length}`)
    scriptsWithPitchdeck.forEach(script => {
      console.log(`  ✅ "${script.title}"`)
    })
    
    console.log(`Scripts with TREATMENT: ${scriptsWithTreatment.length}`)
    scriptsWithTreatment.forEach(script => {
      console.log(`  ✅ "${script.title}"`)
    })
    
    // Check most recent uploads
    console.log('\n=== RECENT FILE UPLOADS ===')
    const recentFiles = await prisma.scriptFile.findMany({
      include: {
        script: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    recentFiles.forEach(file => {
      console.log(`${file.createdAt.toISOString()}: ${file.fileType} - ${file.fileName} (Script: ${file.script.title})`)
    })
    
  } catch (error) {
    console.error('Error analyzing database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugFileIssues()
