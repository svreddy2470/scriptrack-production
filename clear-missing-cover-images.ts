import { config } from 'dotenv'
config()

import { prisma } from './lib/db'

async function clearMissingCoverImages() {
  try {
    console.log('=== CLEARING MISSING COVER IMAGE REFERENCES ===\n')
    
    // Update all scripts to have null cover images
    const result = await prisma.script.updateMany({
      data: {
        coverImageUrl: null
      }
    })
    
    console.log(`✅ Cleared cover image URLs for ${result.count} scripts`)
    console.log('   Users can now upload new cover images without errors')
    
  } catch (error) {
    console.error('Failed to clear cover images:', error instanceof Error ? error.message : String(error))
  } finally {
    await prisma.$disconnect()
  }
}

clearMissingCoverImages().catch(console.error)
