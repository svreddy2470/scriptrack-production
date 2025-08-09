
/**
 * Storage Status Checker
 * 
 * This script checks the current storage configuration and provides
 * guidance on setting up persistent storage for production deployments.
 */

import { config } from 'dotenv'
config() // Load environment variables

import { Storage } from '../lib/storage'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStorageStatus() {
  console.log('🔍 STORAGE CONFIGURATION STATUS\n')

  // Check environment configuration
  const isCloudConfigured = Storage.isCloudConfigured()
  console.log('📊 Configuration Status:')
  console.log(`   Cloud Storage: ${isCloudConfigured ? '✅ Configured' : '❌ Not Configured'}`)
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`)
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`   AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET ? '✅ Set' : '❌ Missing'}`)
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'us-east-1'}`)
  console.log(`   CDN_BASE_URL: ${process.env.CDN_BASE_URL || 'Not set (optional)'}`)

  console.log('\n📁 File Storage Analysis:')
  
  try {
    // Check database for file records
    const scriptFiles = await prisma.scriptFile.findMany({
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        createdAt: true
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

    console.log(`   Script Files in DB: ${scriptFiles.length}`)
    console.log(`   Scripts with Cover Images: ${scripts.length}`)

    // Analyze file URLs to understand storage distribution
    let localFiles = 0
    let cloudFiles = 0
    let totalFileSize = 0

    scriptFiles.forEach(file => {
      totalFileSize += file.fileSize || 0
      if (file.fileUrl.includes('/api/files/')) {
        localFiles++
      } else if (file.fileUrl.includes('amazonaws.com') || file.fileUrl.includes('cloudfront.net')) {
        cloudFiles++
      }
    })

    scripts.forEach(script => {
      if (script.coverImageUrl?.includes('/api/files/')) {
        localFiles++
      } else if (script.coverImageUrl?.includes('amazonaws.com') || script.coverImageUrl?.includes('cloudfront.net')) {
        cloudFiles++
      }
    })

    console.log(`   Local Storage Files: ${localFiles}`)
    console.log(`   Cloud Storage Files: ${cloudFiles}`)
    console.log(`   Total File Size: ${(totalFileSize / (1024 * 1024)).toFixed(2)} MB`)

    console.log('\n⚠️  STORAGE WARNINGS:')
    
    if (!isCloudConfigured) {
      console.log('   🚨 CRITICAL: Cloud storage not configured!')
      console.log('   📝 Files are stored locally and WILL BE LOST during redeployments')
      console.log('   🔧 Configure AWS S3 credentials in .env file to enable persistent storage')
    }

    if (localFiles > 0 && isCloudConfigured) {
      console.log(`   ⚠️  WARNING: ${localFiles} files are still using local storage`)
      console.log('   🔄 Run storage migration to move them to persistent storage')
    }

    if (localFiles > 0 && !isCloudConfigured) {
      console.log(`   💀 DANGER: ${localFiles} files will be LOST on next deployment!`)
      console.log('   ⚡ URGENT: Configure cloud storage immediately!')
    }

    console.log('\n📋 SETUP INSTRUCTIONS:')
    console.log('   1. Create an AWS S3 bucket for file storage')
    console.log('   2. Create IAM user with S3 permissions')
    console.log('   3. Add AWS credentials to .env file:')
    console.log('      AWS_ACCESS_KEY_ID="your-access-key"')
    console.log('      AWS_SECRET_ACCESS_KEY="your-secret-key"')
    console.log('      AWS_S3_BUCKET="your-bucket-name"')
    console.log('      AWS_REGION="us-east-1"')
    console.log('   4. (Optional) Add CDN_BASE_URL for CloudFront')
    console.log('   5. Restart the application')
    console.log('   6. Run migration if you have existing files')

  } catch (error) {
    console.error('❌ Error checking database:', error instanceof Error ? error.message : String(error))
  } finally {
    await prisma.$disconnect()
  }
}

checkStorageStatus().catch(console.error)
