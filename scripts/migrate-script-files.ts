
import { prisma } from '@/lib/db'

async function migrateScriptFiles() {
  console.log('Starting script files migration...')
  
  try {
    // First, let's get all existing scripts with their file data
    const existingScripts = await prisma.$queryRaw`
      SELECT id, "scriptFileUrl", "fileName", "fileSize", "submittedBy" 
      FROM scripts 
      WHERE "scriptFileUrl" IS NOT NULL
    ` as Array<{
      id: string
      scriptFileUrl: string
      fileName: string | null
      fileSize: number | null
      submittedBy: string
    }>
    
    console.log(`Found ${existingScripts.length} scripts with files to migrate`)
    
    // Create the ScriptFile table first by generating and applying the schema
    console.log('Creating ScriptFile table...')
    
    // For each existing script, create a ScriptFile entry
    for (const script of existingScripts) {
      if (script.scriptFileUrl) {
        try {
          await prisma.scriptFile.create({
            data: {
              scriptId: script.id,
              fileType: 'SCREENPLAY', // Default to screenplay for existing files
              fileName: script.fileName || 'legacy-script.pdf',
              fileUrl: script.scriptFileUrl,
              fileSize: script.fileSize || 0,
              version: 1,
              isLatest: true,
              uploadedBy: script.submittedBy,
            }
          })
          console.log(`Migrated file for script: ${script.id}`)
        } catch (error) {
          console.error(`Error migrating script ${script.id}:`, error)
        }
      }
    }
    
    console.log('Script files migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Run the migration
migrateScriptFiles()
  .then(() => {
    console.log('Migration completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
