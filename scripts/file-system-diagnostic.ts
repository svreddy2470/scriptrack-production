
import { PrismaClient } from '@prisma/client'
import { readFile, writeFile, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface FileIssue {
  type: 'missing' | 'corrupted' | 'orphaned'
  filename: string
  expectedSize?: number
  actualSize?: number
  content?: string
  databaseRecord?: any
}

async function diagnosticScan() {
  console.log('🔍 SCRIPTRACK FILE SYSTEM DIAGNOSTIC')
  console.log('=' .repeat(60))
  
  const issues: FileIssue[] = []
  const uploadsDir = path.join(process.cwd(), 'uploads')
  
  try {
    // 1. Get all file references from database
    console.log('\n📊 Step 1: Scanning database file references...')
    
    const dbFiles = await prisma.scriptFile.findMany({
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        fileType: true,
        script: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
    
    const scripts = await prisma.script.findMany({
      select: {
        id: true,
        title: true,
        coverImageUrl: true
      },
      where: {
        coverImageUrl: {
          not: null
        }
      }
    })
    
    console.log(`   Found ${dbFiles.length} script files in database`)
    console.log(`   Found ${scripts.length} scripts with cover images`)
    
    // 2. Check each database file reference
    console.log('\n🔍 Step 2: Checking file integrity...')
    
    for (const dbFile of dbFiles) {
      const filename = path.basename(dbFile.fileUrl)
      const filePath = path.join(uploadsDir, filename)
      
      if (!existsSync(filePath)) {
        issues.push({
          type: 'missing',
          filename,
          expectedSize: dbFile.fileSize,
          databaseRecord: dbFile
        })
        console.log(`   ❌ MISSING: ${filename} (expected ${dbFile.fileSize} bytes)`)
      } else {
        try {
          const stats = await stat(filePath)
          const actualSize = stats.size
          
          // Check for suspiciously small files (likely corrupted)
          if (actualSize < 100 && dbFile.fileSize > 1000) {
            const content = await readFile(filePath, 'utf-8')
            issues.push({
              type: 'corrupted',
              filename,
              expectedSize: dbFile.fileSize,
              actualSize,
              content: content.substring(0, 50),
              databaseRecord: dbFile
            })
            console.log(`   🚨 CORRUPTED: ${filename} (expected ${dbFile.fileSize} bytes, got ${actualSize} bytes)`)
            console.log(`      Content: "${content.substring(0, 30)}..."`)
          } else if (Math.abs(actualSize - dbFile.fileSize) > 1000) {
            console.log(`   ⚠️  SIZE MISMATCH: ${filename} (expected ${dbFile.fileSize}, got ${actualSize})`)
          } else {
            console.log(`   ✅ OK: ${filename}`)
          }
        } catch (error) {
          console.log(`   ❌ ERROR reading ${filename}: ${error}`)
        }
      }
    }
    
    // 3. Check cover images
    console.log('\n🖼️  Step 3: Checking cover images...')
    
    for (const script of scripts) {
      if (script.coverImageUrl) {
        const filename = path.basename(script.coverImageUrl)
        const filePath = path.join(uploadsDir, filename)
        
        if (!existsSync(filePath)) {
          issues.push({
            type: 'missing',
            filename,
            databaseRecord: { scriptTitle: script.title, type: 'cover image' }
          })
          console.log(`   ❌ MISSING COVER: ${filename} for "${script.title}"`)
        } else {
          try {
            const stats = await stat(filePath)
            if (stats.size < 50) {
              const content = await readFile(filePath, 'utf-8')
              issues.push({
                type: 'corrupted',
                filename,
                actualSize: stats.size,
                content: content.substring(0, 50),
                databaseRecord: { scriptTitle: script.title, type: 'cover image' }
              })
              console.log(`   🚨 CORRUPTED COVER: ${filename} contains "${content.substring(0, 30)}"`)
            } else {
              console.log(`   ✅ OK COVER: ${filename}`)
            }
          } catch (error) {
            console.log(`   ❌ ERROR reading cover ${filename}: ${error}`)
          }
        }
      }
    }
    
    // 4. Summary Report
    console.log('\n📋 DIAGNOSTIC SUMMARY')
    console.log('=' .repeat(40))
    
    const missingFiles = issues.filter(i => i.type === 'missing')
    const corruptedFiles = issues.filter(i => i.type === 'corrupted')
    
    console.log(`🔴 Missing Files: ${missingFiles.length}`)
    console.log(`🟡 Corrupted Files: ${corruptedFiles.length}`)
    console.log(`🟢 Total Issues Found: ${issues.length}`)
    
    if (issues.length === 0) {
      console.log('\n🎉 NO ISSUES FOUND! File system is healthy.')
    } else {
      console.log('\n📄 DETAILED ISSUE REPORT:')
      
      if (missingFiles.length > 0) {
        console.log('\n❌ MISSING FILES:')
        missingFiles.forEach(issue => {
          console.log(`   • ${issue.filename} (${issue.expectedSize} bytes expected)`)
          if (issue.databaseRecord?.script?.title) {
            console.log(`     Script: "${issue.databaseRecord.script.title}"`)
          }
        })
      }
      
      if (corruptedFiles.length > 0) {
        console.log('\n🚨 CORRUPTED FILES:')
        corruptedFiles.forEach(issue => {
          console.log(`   • ${issue.filename}`)
          console.log(`     Expected: ${issue.expectedSize} bytes`)
          console.log(`     Actual: ${issue.actualSize} bytes`)
          console.log(`     Content: "${issue.content}"`)
          if (issue.databaseRecord?.script?.title) {
            console.log(`     Script: "${issue.databaseRecord.script.title}"`)
          }
        })
      }
      
      console.log('\n💡 RECOMMENDED ACTIONS:')
      console.log('   1. Run: yarn ts-node scripts/file-system-repair.ts')
      console.log('   2. Ask users to re-upload corrupted files')
      console.log('   3. Implement file backup strategy')
      console.log('   4. Monitor uploads directory regularly')
    }
    
    // Save diagnostic report
    const reportPath = path.join(process.cwd(), 'file-diagnostic-report.json')
    await writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      issues,
      summary: {
        totalIssues: issues.length,
        missingFiles: missingFiles.length,
        corruptedFiles: corruptedFiles.length
      }
    }, null, 2))
    
    console.log(`\n💾 Diagnostic report saved to: ${reportPath}`)
    
    return issues
    
  } catch (error) {
    console.error('❌ Diagnostic scan failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Allow script to be run directly
if (require.main === module) {
  diagnosticScan()
    .then(issues => {
      if (issues.length > 0) {
        console.log('\n🚨 ISSUES DETECTED! Run repair script to fix corrupted files.')
        process.exit(1)
      } else {
        console.log('\n✅ FILE SYSTEM HEALTHY!')
        process.exit(0)
      }
    })
    .catch(error => {
      console.error('Diagnostic failed:', error)
      process.exit(1)
    })
}

export { diagnosticScan }
