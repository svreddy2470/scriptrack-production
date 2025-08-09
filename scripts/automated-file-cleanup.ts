
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';
import { Storage } from '../lib/storage';

const prisma = new PrismaClient();

interface CleanupResult {
  scriptFilesRemoved: number;
  coverImagesCleared: number;
  userPhotosCleared: number;
  totalItemsCleaned: number;
  skippedItems: number;
  errors: string[];
}

async function checkFileExists(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    const key = Storage.extractKeyFromUrl(url);
    if (!key) return false;

    // Check multiple possible locations for the file
    const possiblePaths = [
      join(process.cwd(), 'persistent-uploads', key),
      join(process.cwd(), 'uploads', key),
      join(process.cwd(), 'uploads-backup', key),
    ];

    // If any path exists, consider the file as existing
    for (const filePath of possiblePaths) {
      if (existsSync(filePath)) {
        return true;
      }
    }

    // Also check if using S3 storage
    if (Storage.isCloudConfigured()) {
      // If S3 is configured, assume files might be there
      // Don't aggressively delete based on local file system
      return true;
    }

    return false;
  } catch (error) {
    // In case of error, assume file exists to prevent accidental deletion
    return true;
  }
}

async function cleanupBrokenFiles(): Promise<CleanupResult> {
  console.log('🧹 Starting Automated File Cleanup...\n');

  const result: CleanupResult = {
    scriptFilesRemoved: 0,
    coverImagesCleared: 0,
    userPhotosCleared: 0,
    totalItemsCleaned: 0,
    skippedItems: 0,
    errors: [],
  };

  try {
    // Clean up ScriptFile records with broken URLs
    console.log('📄 Cleaning up broken ScriptFile records...');
    const scriptFiles = await prisma.scriptFile.findMany({
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        script: { select: { title: true } },
      },
    });

    for (const file of scriptFiles) {
      try {
        const exists = await checkFileExists(file.fileUrl);
        if (!exists) {
          await prisma.scriptFile.delete({
            where: { id: file.id },
          });
          console.log(`   ❌ Removed: ${file.script.title} - ${file.fileName}`);
          result.scriptFilesRemoved++;
        } else {
          console.log(`   ✅ Kept: ${file.script.title} - ${file.fileName}`);
          result.skippedItems++;
        }
      } catch (error) {
        const errorMsg = `Failed to process ScriptFile ${file.id}: ${error}`;
        console.error(`   🚨 ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Clean up Script cover images with broken URLs
    console.log('\n🖼️  Cleaning up broken cover images...');
    const scriptsWithCovers = await prisma.script.findMany({
      where: {
        coverImageUrl: { not: null },
      },
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
      },
    });

    for (const script of scriptsWithCovers) {
      try {
        if (script.coverImageUrl) {
          const exists = await checkFileExists(script.coverImageUrl);
          if (!exists) {
            await prisma.script.update({
              where: { id: script.id },
              data: { coverImageUrl: null },
            });
            console.log(`   ❌ Cleared cover image: ${script.title}`);
            result.coverImagesCleared++;
          } else {
            console.log(`   ✅ Kept cover image: ${script.title}`);
            result.skippedItems++;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process Script cover ${script.id}: ${error}`;
        console.error(`   🚨 ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Clean up User profile photos with broken URLs
    console.log('\n👤 Cleaning up broken user profile photos...');
    const usersWithPhotos = await prisma.user.findMany({
      where: {
        photoUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
      },
    });

    for (const user of usersWithPhotos) {
      try {
        if (user.photoUrl) {
          const exists = await checkFileExists(user.photoUrl);
          if (!exists) {
            await prisma.user.update({
              where: { id: user.id },
              data: { photoUrl: null },
            });
            console.log(`   ❌ Cleared profile photo: ${user.name || user.email}`);
            result.userPhotosCleared++;
          } else {
            console.log(`   ✅ Kept profile photo: ${user.name || user.email}`);
            result.skippedItems++;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process User photo ${user.id}: ${error}`;
        console.error(`   🚨 ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    result.totalItemsCleaned = result.scriptFilesRemoved + result.coverImagesCleared + result.userPhotosCleared;

    return result;
  } catch (error) {
    result.errors.push(`Fatal cleanup error: ${error}`);
    return result;
  }
}

async function generateActivityLog(result: CleanupResult) {
  try {
    // Note: Activity logs are script-specific, so we skip logging for system-wide cleanup operations
    // Individual file deletions are logged through the file deletion API
    console.log('Cleanup operation completed - activity logging skipped for system-wide operations');
  } catch (error) {
    console.error('Failed to create activity log:', error);
  }
}

async function printCleanupReport(result: CleanupResult) {
  console.log('\n📊 AUTOMATED CLEANUP REPORT');
  console.log('==============================\n');

  console.log(`🧹 CLEANUP SUMMARY:`);
  console.log(`   Script Files Removed: ${result.scriptFilesRemoved}`);
  console.log(`   Cover Images Cleared: ${result.coverImagesCleared}`);
  console.log(`   User Photos Cleared: ${result.userPhotosCleared}`);
  console.log(`   Total Items Cleaned: ${result.totalItemsCleaned}`);
  console.log(`   Items Preserved: ${result.skippedItems}`);
  console.log(`   Errors: ${result.errors.length}\n`);

  if (result.errors.length > 0) {
    console.log(`🚨 ERRORS ENCOUNTERED:`);
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    console.log('');
  }

  if (result.totalItemsCleaned > 0) {
    console.log(`✅ SUCCESS: Removed ${result.totalItemsCleaned} broken file references!`);
    console.log(`📝 The database is now clean of broken file links.`);
    console.log(`🔄 Users will no longer see 404 errors for these files.\n`);
  } else {
    console.log(`🎉 No broken files found - database is already clean!\n`);
  }

  console.log(`💡 NEXT STEPS:`);
  console.log(`1. Implement admin file management interface`);
  console.log(`2. Add file validation before saving to database`);
  console.log(`3. Set up periodic file integrity checks`);
  console.log(`4. Consider implementing file backup procedures\n`);
}

async function main() {
  try {
    const result = await cleanupBrokenFiles();
    await generateActivityLog(result);
    await printCleanupReport(result);

    // Save detailed report
    const fs = await import('fs/promises');
    await fs.writeFile(
      join(process.cwd(), 'cleanup-report.json'),
      JSON.stringify(result, null, 2)
    );
    console.log('📝 Detailed cleanup report saved to cleanup-report.json');

  } catch (error) {
    console.error('❌ Cleanup process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { cleanupBrokenFiles };
export type { CleanupResult };
