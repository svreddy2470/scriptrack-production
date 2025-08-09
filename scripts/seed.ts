
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
