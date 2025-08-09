
import { prisma } from './lib/db'

async function main() {
  console.log('Checking scripts and files...')
  
  const scripts = await prisma.script.findMany({
    include: {
      files: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })
  
  console.log('\n=== SCRIPTS IN DATABASE ===')
  scripts.forEach(script => {
    console.log(`\nScript: ${script.title} (${script.id})`)
    console.log(`- Writer: ${script.writers}`)
    console.log(`- Status: ${script.status}`)
    console.log(`- Files: ${script.files.length}`)
    script.files.forEach(file => {
      console.log(`  * ${file.fileType}: ${file.fileName} (v${file.version}, latest: ${file.isLatest})`)
    })
  })
  
  console.log(`\nTotal scripts: ${scripts.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
