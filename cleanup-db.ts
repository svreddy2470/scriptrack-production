
import { prisma } from './lib/db'

async function cleanup() {
  console.log('Cleaning up problematic scripts...')
  
  // Find scripts with no files
  const scriptsWithNoFiles = await prisma.script.findMany({
    where: {
      files: {
        none: {}
      }
    }
  })
  
  console.log(`Found ${scriptsWithNoFiles.length} scripts with no files`)
  
  for (const script of scriptsWithNoFiles) {
    console.log(`Deleting script: "${script.title}" by ${script.writers} (ID: ${script.id})`)
    await prisma.script.delete({ where: { id: script.id } })
  }
  
  console.log('✓ Database cleanup completed')
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
