
/**
 * Storage Migration Script
 * 
 * This script migrates existing local files to persistent cloud storage (S3).
 * It updates database records with new URLs and optionally cleans up local files.
 */

import { config } from 'dotenv'
config() // Load environment variables

import { Storage } from '../lib/storage'
import { PrismaClient } from '@prisma/client'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()

interface MigrationResult {
  success: boolean
  oldUrl: string
  newUrl: string
  error?: string
}

async function migrateFile(fileUrl: string, fileName: string): Promise<MigrationResult> {
  try {
    // Skip if already using cloud storage
    if (!fileUrl.includes('/api/files/')) {
      return {
        success: true,
        oldUrl: fileUrl,
        newUrl: fileUrl
      }
    }

    // Extract filename from URL
    const filename = fileUrl.split('/api/files/')[1]
    const localFilePath = join(process.cwd(), 'uploads', filename)

    // Check if local file exists
    if (!existsSync(localFilePath)) {
      throw new Error('Local file not found')
    }

    // Read local file
    const fileBuffer = await readFile(localFilePath)
    const fileStats = await stat(localFilePath)

    console.log(`   📤 Uploading ${filename} (${(fileStats.size / 1024).toFixed(1)} KB)...`)

    // Upload to cloud storage
    const uploadResult = await Storage.uploadFile(fileBuffer, fileName || filename)
    const newUrl = uploadResult.cdnUrl || uploadResult.url

    return {
      success: true,
      oldUrl: fileUrl,
      newUrl: newUrl
    }

  } catch (error) {
    return {
      success: false,
      oldUrl: fileUrl,
      newUrl: fileUrl,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function runMigration() {
  console.log('🚀 STARTING STORAGE MIGRATION TO PERSISTENT STORAGE\n')

  // Check if cloud storage is configured
  if (!Storage.isCloudConfigured()) {
    console.error('❌ ERROR: Cloud storage is not configured!')
    console.error('   Please configure AWS S3 credentials in .env file first.')
    console.error('   Run: yarn tsx scripts/storage-status.ts for setup instructions.')
    process.exit(1)
  }

  console.log('✅ Cloud storage is configured. Starting migration...\n')

  let totalFiles = 0
  let migratedFiles = 0
  let failedFiles = 0
  const failures: string[] = []

  try {
    // Migrate script files
    console.log('📁 Migrating script files...')
    const scriptFiles = await prisma.scriptFile.findMany({
      where: {
        fileUrl: {
          contains: '/api/files/'
        }
      }
    })

    for (const file of scriptFiles) {
      totalFiles++
      const result = await migrateFile(file.fileUrl, file.fileName)
      
      if (result.success) {
        // Update database with new URL
        await prisma.scriptFile.update({
          where: { id: file.id },
          data: { fileUrl: result.newUrl }
        })
        migratedFiles++
        console.log(`   ✅ ${file.fileName}`)
      } else {
        failedFiles++
        failures.push(`${file.fileName}: ${result.error}`)
        console.log(`   ❌ ${file.fileName}: ${result.error}`)
      }
    }

    // Migrate cover images
    console.log('\n🖼️  Migrating cover images...')
    const scriptsWithCovers = await prisma.script.findMany({
      where: {
        coverImageUrl: {
          contains: '/api/files/'
        }
      }
    })

    for (const script of scriptsWithCovers) {
      if (!script.coverImageUrl) continue
      
      totalFiles++
      const filename = script.coverImageUrl.split('/api/files/')[1]
      const result = await migrateFile(script.coverImageUrl, filename)
      
      if (result.success) {
        // Update database with new URL
        await prisma.script.update({
          where: { id: script.id },
          data: { coverImageUrl: result.newUrl }
        })
        migratedFiles++
        console.log(`   ✅ Cover for "${script.title}"`)
      } else {
        failedFiles++
        failures.push(`Cover for "${script.title}": ${result.error}`)
        console.log(`   ❌ Cover for "${script.title}": ${result.error}`)
      }
    }

    // Migration summary
    console.log('\n📊 MIGRATION SUMMARY:')
    console.log(`   Total Files: ${totalFiles}`)
    console.log(`   Migrated Successfully: ${migratedFiles}`)
    console.log(`   Failed: ${failedFiles}`)

    if (failures.length > 0) {
      console.log('\n❌ FAILED MIGRATIONS:')
      failures.forEach(failure => console.log(`   • ${failure}`))
    }

    if (migratedFiles > 0) {
      console.log('\n✅ Migration completed successfully!')
      console.log('   All migrated files are now stored in persistent cloud storage.')
      console.log('   Files will survive redeployments.')
      
      console.log('\n🧹 CLEANUP (Optional):')
      console.log('   You can now safely delete the local uploads directory:')
      console.log('   rm -rf uploads/')
      console.log('   ⚠️  Only do this AFTER verifying all files work correctly!')
    }

  } catch (error) {
    console.error('💥 Migration failed:', error instanceof Error ? error.message : String(error))
  } finally {
    await prisma.$disconnect()
  }
}

runMigration().catch(console.error)
