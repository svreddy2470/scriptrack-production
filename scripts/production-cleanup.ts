
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// CRITICAL: Main admin account that MUST be preserved
const MAIN_ADMIN_EMAIL = 'venkat@thespiritmedia.com'

async function cleanupForProduction() {
  console.log('🚀 Starting Production Cleanup for ScripTrack...')
  console.log('=' .repeat(60))
  
  try {
    // Step 1: Verify main admin exists before any cleanup
    console.log('\n🔍 Step 1: Verifying main admin account exists...')
    const mainAdmin = await prisma.user.findUnique({
      where: { email: MAIN_ADMIN_EMAIL }
    })
    
    if (!mainAdmin) {
      throw new Error(`❌ CRITICAL: Main admin account ${MAIN_ADMIN_EMAIL} not found! Aborting cleanup.`)
    }
    
    console.log(`✅ Main admin found: ${mainAdmin.name} (${mainAdmin.email}) - Role: ${mainAdmin.role}`)
    
    // Step 2: Get current state before cleanup
    console.log('\n📊 Step 2: Current database state...')
    const beforeStats = {
      users: await prisma.user.count(),
      scripts: await prisma.script.count(),
      scriptFiles: await prisma.scriptFile.count(),
      assignments: await prisma.assignment.count(),
      feedback: await prisma.feedback.count(),
      activities: await prisma.activity.count()
    }
    
    console.log('Before cleanup:')
    Object.entries(beforeStats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })
    
    // Step 3: Clean up dummy scripts and related data
    console.log('\n🧹 Step 3: Cleaning up dummy scripts and related data...')
    
    // Get all scripts to clean up their files
    const scriptsToDelete = await prisma.script.findMany({
      include: {
        files: true
      }
    })
    
    console.log(`Found ${scriptsToDelete.length} scripts to clean up`)
    
    // Clean up uploaded files
    const uploadsDir = path.join(__dirname, '..', 'uploads')
    let filesDeleted = 0
    
    for (const script of scriptsToDelete) {
      for (const file of script.files) {
        const filePath = path.join(uploadsDir, path.basename(file.fileUrl))
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            filesDeleted++
            console.log(`  Deleted file: ${path.basename(filePath)}`)
          }
        } catch (error) {
          console.warn(`  Warning: Could not delete file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error')
        }
      }
      
      // Also clean up cover images
      if (script.coverImageUrl) {
        const coverImagePath = path.join(uploadsDir, path.basename(script.coverImageUrl))
        try {
          if (fs.existsSync(coverImagePath)) {
            fs.unlinkSync(coverImagePath)
            filesDeleted++
            console.log(`  Deleted cover image: ${path.basename(coverImagePath)}`)
          }
        } catch (error) {
          console.warn(`  Warning: Could not delete cover image ${coverImagePath}:`, error instanceof Error ? error.message : 'Unknown error')
        }
      }
    }
    
    console.log(`✅ Deleted ${filesDeleted} uploaded files`)
    
    // Delete all scripts (this will cascade delete related data)
    const deletedScripts = await prisma.script.deleteMany({})
    console.log(`✅ Deleted ${deletedScripts.count} scripts (with all related data)`)
    
    // Step 4: Clean up dummy user accounts (except main admin)
    console.log('\n👥 Step 4: Cleaning up dummy user accounts...')
    
    const usersToDelete = await prisma.user.findMany({
      where: {
        email: {
          not: MAIN_ADMIN_EMAIL
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    console.log(`Found ${usersToDelete.length} dummy accounts to delete:`)
    usersToDelete.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.name}`)
    })
    
    // Delete all users except main admin
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          not: MAIN_ADMIN_EMAIL
        }
      }
    })
    
    console.log(`✅ Deleted ${deletedUsers.count} dummy user accounts`)
    
    // Step 5: Verify main admin is still intact
    console.log('\n🔒 Step 5: Verifying main admin account integrity...')
    const verifyAdmin = await prisma.user.findUnique({
      where: { email: MAIN_ADMIN_EMAIL }
    })
    
    if (!verifyAdmin) {
      throw new Error('❌ CRITICAL: Main admin account was accidentally deleted!')
    }
    
    console.log(`✅ Main admin account verified: ${verifyAdmin.email} - Status: ${verifyAdmin.status}`)
    
    // Step 6: Final state report
    console.log('\n📈 Step 6: Final database state...')
    const afterStats = {
      users: await prisma.user.count(),
      scripts: await prisma.script.count(),
      scriptFiles: await prisma.scriptFile.count(),
      assignments: await prisma.assignment.count(),
      feedback: await prisma.feedback.count(),
      activities: await prisma.activity.count()
    }
    
    console.log('After cleanup:')
    Object.entries(afterStats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })
    
    console.log('\n🎉 Production cleanup completed successfully!')
    console.log('=' .repeat(60))
    console.log('✅ PRESERVED:')
    console.log(`   • Main admin account: ${MAIN_ADMIN_EMAIL}`)
    console.log('   • Database structure and relationships')
    console.log('   • Authentication system')
    console.log('')
    console.log('🗑️  CLEANED UP:')
    console.log(`   • ${deletedUsers.count} dummy user accounts`)
    console.log(`   • ${deletedScripts.count} dummy scripts`)
    console.log(`   • ${filesDeleted} uploaded files`)
    console.log('   • All related dummy data (assignments, feedback, activities)')
    console.log('')
    console.log('🔐 ADMIN LOGIN CREDENTIALS:')
    console.log(`   Email: ${MAIN_ADMIN_EMAIL}`)
    console.log('   Password: Bekind@2026')
    console.log('')
    console.log('🚀 ScripTrack is now ready for production!')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    console.error('⚠️  Database may be in an inconsistent state. Please review manually.')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Safety check function
async function preCleanupSafetyCheck() {
  console.log('🛡️  Running pre-cleanup safety checks...')
  
  const mainAdmin = await prisma.user.findUnique({
    where: { email: MAIN_ADMIN_EMAIL }
  })
  
  if (!mainAdmin) {
    throw new Error(`❌ SAFETY CHECK FAILED: Main admin ${MAIN_ADMIN_EMAIL} not found!`)
  }
  
  if (mainAdmin.role !== 'ADMIN') {
    throw new Error(`❌ SAFETY CHECK FAILED: Main admin does not have ADMIN role!`)
  }
  
  if (mainAdmin.status !== 'ACTIVE') {
    throw new Error(`❌ SAFETY CHECK FAILED: Main admin is not ACTIVE!`)
  }
  
  console.log('✅ All safety checks passed')
  return true
}

async function main() {
  try {
    await preCleanupSafetyCheck()
    await cleanupForProduction()
  } catch (error) {
    console.error('❌ Production cleanup aborted due to error:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { cleanupForProduction, preCleanupSafetyCheck }
