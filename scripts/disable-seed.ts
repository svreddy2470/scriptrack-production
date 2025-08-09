
import fs from 'fs'
import path from 'path'

// Script to disable the seed script to prevent dummy data re-population
async function disableSeedScript() {
  console.log('🚫 Disabling seed script to prevent dummy data re-population...')
  
  const seedPath = path.join(__dirname, 'seed.ts')
  const seedBackupPath = path.join(__dirname, 'seed.ts.backup')
  const disabledSeedPath = path.join(__dirname, 'seed-disabled.ts')
  
  try {
    // Create backup
    if (fs.existsSync(seedPath)) {
      fs.copyFileSync(seedPath, seedBackupPath)
      console.log('✅ Created backup: seed.ts.backup')
    }
    
    // Create disabled version
    const disabledSeedContent = `
// SEED SCRIPT DISABLED FOR PRODUCTION
// This script has been disabled to prevent accidental re-population of dummy data
// Original seed script backed up as seed.ts.backup

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('⚠️  Seed script is DISABLED for production')
  console.log('🚫 No dummy data will be created')
  console.log('✅ Production database is clean and ready')
  console.log('')
  console.log('🔐 Admin Login:')
  console.log('   Email: venkat@thespiritmedia.com')
  console.log('   Password: Bekind@2026')
  console.log('')
  console.log('💡 To re-enable seeding (NOT recommended for production):')
  console.log('   1. Rename seed.ts.backup to seed.ts')
  console.log('   2. Delete this file (seed-disabled.ts)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
`
    
    // Replace seed script with disabled version
    fs.writeFileSync(seedPath, disabledSeedContent)
    console.log('✅ Seed script disabled successfully')
    
    console.log('')
    console.log('📋 What was done:')
    console.log('  • Original seed.ts backed up as seed.ts.backup')
    console.log('  • seed.ts replaced with production-safe version')
    console.log('  • Running "npx prisma db seed" will now show production status instead of creating dummy data')
    
  } catch (error) {
    console.error('❌ Failed to disable seed script:', error)
    throw error
  }
}

if (require.main === module) {
  disableSeedScript()
}

export { disableSeedScript }
