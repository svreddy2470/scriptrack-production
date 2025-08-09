
import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface BrokenReference {
  scriptId: string;
  scriptTitle: string;
  type: 'coverImage' | 'file';
  fileId?: string;
  url: string;
  fileName: string;
  fileType?: string;
}

async function identifyBrokenReferences(): Promise<BrokenReference[]> {
  const scripts = await prisma.script.findMany({
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
      files: {
        select: {
          id: true,
          fileType: true,
          fileName: true,
          fileUrl: true,
        }
      }
    }
  });

  const brokenReferences: BrokenReference[] = [];

  for (const script of scripts) {
    // Check cover image
    if (script.coverImageUrl) {
      const fileName = script.coverImageUrl.split('/').pop() || '';
      const filePath = join(process.cwd(), 'uploads', fileName);
      const exists = existsSync(filePath);

      if (!exists) {
        brokenReferences.push({
          scriptId: script.id,
          scriptTitle: script.title,
          type: 'coverImage',
          url: script.coverImageUrl,
          fileName: fileName
        });
      }
    }

    // Check script files
    if (script.files && script.files.length > 0) {
      for (const file of script.files) {
        const fileName = file.fileUrl.split('/').pop() || '';
        const filePath = join(process.cwd(), 'uploads', fileName);
        const exists = existsSync(filePath);

        if (!exists) {
          brokenReferences.push({
            scriptId: script.id,
            scriptTitle: script.title,
            type: 'file',
            fileId: file.id,
            url: file.fileUrl,
            fileName: fileName,
            fileType: file.fileType
          });
        }
      }
    }
  }

  return brokenReferences;
}

async function cleanupBrokenReferences(brokenRefs: BrokenReference[]) {
  console.log(`🧹 Starting cleanup of ${brokenRefs.length} broken references...`);

  let coverImagesCleared = 0;
  let filesDeleted = 0;

  // Group by type for efficient processing
  const coverImageRefs = brokenRefs.filter(ref => ref.type === 'coverImage');
  const fileRefs = brokenRefs.filter(ref => ref.type === 'file');

  // Clear broken cover image references
  for (const ref of coverImageRefs) {
    try {
      await prisma.script.update({
        where: { id: ref.scriptId },
        data: { coverImageUrl: null }
      });
      console.log(`✅ Cleared cover image for script: "${ref.scriptTitle}"`);
      coverImagesCleared++;
    } catch (error) {
      console.error(`❌ Failed to clear cover image for script "${ref.scriptTitle}":`, error);
    }
  }

  // Delete broken file records
  for (const ref of fileRefs) {
    if (ref.fileId) {
      try {
        await prisma.scriptFile.delete({
          where: { id: ref.fileId }
        });
        console.log(`✅ Deleted file record: "${ref.fileName}" (${ref.fileType}) from script "${ref.scriptTitle}"`);
        filesDeleted++;
      } catch (error) {
        console.error(`❌ Failed to delete file record "${ref.fileName}" from script "${ref.scriptTitle}":`, error);
      }
    }
  }

  return { coverImagesCleared, filesDeleted };
}

async function generateCleanupReport(brokenRefs: BrokenReference[]) {
  const report = {
    timestamp: new Date().toISOString(),
    totalBrokenReferences: brokenRefs.length,
    breakdown: {
      coverImages: brokenRefs.filter(ref => ref.type === 'coverImage').length,
      files: brokenRefs.filter(ref => ref.type === 'file').length
    },
    scriptsAffected: [...new Set(brokenRefs.map(ref => ref.scriptId))].length,
    brokenReferences: brokenRefs.map(ref => ({
      scriptTitle: ref.scriptTitle,
      type: ref.type,
      fileName: ref.fileName,
      fileType: ref.fileType || 'N/A'
    }))
  };

  console.log('\n📊 CLEANUP REPORT');
  console.log('='.repeat(50));
  console.log(`Total broken references: ${report.totalBrokenReferences}`);
  console.log(`Scripts affected: ${report.scriptsAffected}`);
  console.log(`- Cover images: ${report.breakdown.coverImages}`);
  console.log(`- Files: ${report.breakdown.files}`);
  console.log('\n📝 Affected Scripts:');
  
  const scriptBreakdown = brokenRefs.reduce((acc, ref) => {
    if (!acc[ref.scriptTitle]) {
      acc[ref.scriptTitle] = { coverImage: false, files: [] };
    }
    if (ref.type === 'coverImage') {
      acc[ref.scriptTitle].coverImage = true;
    } else {
      acc[ref.scriptTitle].files.push(`${ref.fileName} (${ref.fileType})`);
    }
    return acc;
  }, {} as Record<string, { coverImage: boolean; files: string[] }>);

  Object.entries(scriptBreakdown).forEach(([title, breakdown]) => {
    const issues = [];
    if (breakdown.coverImage) issues.push('Cover Image');
    if (breakdown.files.length > 0) issues.push(`${breakdown.files.length} Files`);
    console.log(`  • ${title}: ${issues.join(', ')}`);
  });

  return report;
}

async function main() {
  try {
    console.log('🔍 SCRIPTRACK FILE CLEANUP UTILITY');
    console.log('='.repeat(50));
    console.log('Analyzing database for broken file references...\n');

    // Step 1: Identify broken references
    const brokenRefs = await identifyBrokenReferences();
    
    if (brokenRefs.length === 0) {
      console.log('✅ No broken file references found! Database is clean.');
      return;
    }

    // Step 2: Generate pre-cleanup report
    await generateCleanupReport(brokenRefs);

    // Step 3: Prompt for confirmation (in production, you might want to require confirmation)
    console.log('\n⚠️  WARNING: This will permanently remove broken file references from the database.');
    console.log('Files cannot be recovered - users will need to re-upload them.');
    console.log('\nProceeding with cleanup...\n');

    // Step 4: Perform cleanup
    const results = await cleanupBrokenReferences(brokenRefs);

    // Step 5: Final summary
    console.log('\n🎉 CLEANUP COMPLETED');
    console.log('='.repeat(30));
    console.log(`Cover images cleared: ${results.coverImagesCleared}`);
    console.log(`File records deleted: ${results.filesDeleted}`);
    console.log(`Total operations: ${results.coverImagesCleared + results.filesDeleted}`);
    console.log('\n✅ Database is now clean and ready for file re-uploads!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Users need to re-upload their missing files');
    console.log('2. Cover images need to be re-uploaded');
    console.log('3. Script files need to be re-uploaded');
    console.log('4. Consider implementing file backup strategy');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { identifyBrokenReferences, cleanupBrokenReferences, generateCleanupReport };
