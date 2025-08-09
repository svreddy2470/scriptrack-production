
import { PrismaClient } from '@prisma/client'
import { readFile, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function repairFileSystem() {
  console.log('🔧 SCRIPTRACK FILE SYSTEM REPAIR')
  console.log('=' .repeat(60))
  
  const uploadsDir = path.join(process.cwd(), 'uploads')
  let repairedCount = 0
  let removedCount = 0
  
  try {
    // 1. Remove corrupted dummy files
    console.log('\n🧹 Step 1: Removing corrupted dummy files...')
    
    const corruptedFiles = [
      '1753523028507_WhatsApp_Image_2025-04-12_at_18.05.46_2a80e585.jpg',
      '1753523033625_Carnage-Screenplay.pdf',
      '1753525029360_Carnage-Screenplay.pdf',
      '1753525061199_vlcsnap-2025-04-16-17h17m37s395.png',
      '1753525821384_Carnage-Screenplay.pdf',
      '1753526686588_anvikshiki_Hand-drawn_style_sketch_of_a_young_Indian_woman_in_h_22dd847b-a618-48eb-867e-37be7e4a9c8c.webp'
    ]
    
    for (const filename of corruptedFiles) {
      const filePath = path.join(uploadsDir, filename)
      if (existsSync(filePath)) {
        try {
          const content = await readFile(filePath, 'utf-8')
          if (content.includes('dummy') || content.length < 100) {
            await unlink(filePath)
            console.log(`   🗑️  Removed corrupted file: ${filename}`)
            removedCount++
            
            // Update database to remove reference
            await prisma.scriptFile.deleteMany({
              where: {
                fileUrl: { endsWith: filename }
              }
            })
            
            // Update script cover image references
            await prisma.script.updateMany({
              where: {
                coverImageUrl: { endsWith: filename }
              },
              data: {
                coverImageUrl: null
              }
            })
          }
        } catch (error) {
          console.log(`   ⚠️  Could not process ${filename}: ${error}`)
        }
      }
    }
    
    // 2. Remove test/mock files
    console.log('\n🧪 Step 2: Cleaning up test files...')
    
    const testFiles = [
      '1753523590354_my-awesome-screenplay.pdf',
      '1753523590361_pitch-presentation.pptx', 
      '1753523590368_story-treatment.pdf',
      '1753523590375_one-line-summary.pdf'
    ]
    
    for (const filename of testFiles) {
      const filePath = path.join(uploadsDir, filename)
      if (existsSync(filePath)) {
        try {
          const content = await readFile(filePath, 'utf-8')
          if (content.includes('Mock content')) {
            await unlink(filePath)
            console.log(`   🗑️  Removed test file: ${filename}`)
            removedCount++
            
            // Clean up database references
            await prisma.scriptFile.deleteMany({
              where: {
                fileUrl: { endsWith: filename }
              }
            })
          }
        } catch (error) {
          console.log(`   ⚠️  Could not process test file ${filename}: ${error}`)
        }
      }
    }
    
    // 3. Validate remaining files
    console.log('\n✅ Step 3: Validating remaining files...')
    
    const remainingDbFiles = await prisma.scriptFile.findMany({
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        script: {
          select: {
            title: true
          }
        }
      }
    })
    
    console.log(`   Found ${remainingDbFiles.length} files in database`)
    
    for (const dbFile of remainingDbFiles) {
      const filename = path.basename(dbFile.fileUrl)
      const filePath = path.join(uploadsDir, filename)
      
      if (existsSync(filePath)) {
        console.log(`   ✅ Validated: ${filename} for "${dbFile.script.title}"`)
      } else {
        console.log(`   ❌ Missing: ${filename} for "${dbFile.script.title}"`)
        console.log(`      -> User will need to re-upload this file`)
      }
    }
    
    console.log('\n📊 REPAIR SUMMARY')
    console.log('=' .repeat(40))
    console.log(`🗑️  Files Removed: ${removedCount}`)
    console.log(`🔧 Files Repaired: ${repairedCount}`)
    console.log(`✅ Remaining Valid Files: ${remainingDbFiles.length}`)
    
    // 4. Generate user notification report
    const missingFiles = []
    for (const dbFile of remainingDbFiles) {
      const filename = path.basename(dbFile.fileUrl)
      const filePath = path.join(uploadsDir, filename)
      if (!existsSync(filePath)) {
        missingFiles.push({
          script: dbFile.script.title,
          filename: dbFile.fileName,
          fileType: filename
        })
      }
    }
    
    if (missingFiles.length > 0) {
      console.log('\n📧 USER NOTIFICATION REQUIRED:')
      console.log('The following files need to be re-uploaded:')
      missingFiles.forEach(file => {
        console.log(`   • "${file.script}": ${file.filename}`)
      })
      
      // Save notification report
      const reportPath = path.join(process.cwd(), 'files-needing-reupload.json')
      await writeFile(reportPath, JSON.stringify(missingFiles, null, 2))
      console.log(`\n💾 Re-upload list saved to: ${reportPath}`)
    }
    
    console.log('\n🎉 FILE SYSTEM REPAIR COMPLETED!')
    console.log('\n💡 NEXT STEPS:')
    console.log('   1. Test file upload functionality')
    console.log('   2. Monitor uploads directory for new issues')
    console.log('   3. Set up automated backup system')
    console.log('   4. Notify users about files needing re-upload')
    
    return {
      removed: removedCount,
      repaired: repairedCount,
      missing: missingFiles.length
    }
    
  } catch (error) {
    console.error('❌ Repair failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Allow script to be run directly
if (require.main === module) {
  repairFileSystem()
    .then(result => {
      console.log(`\n✅ REPAIR COMPLETE: ${result.removed} removed, ${result.repaired} repaired, ${result.missing} missing`)
      process.exit(0)
    })
    .catch(error => {
      console.error('Repair failed:', error)
      process.exit(1)
    })
}

export { repairFileSystem }
