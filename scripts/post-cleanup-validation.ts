
import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function validateCleanupResults() {
  try {
    console.log('🔍 POST-CLEANUP VALIDATION');
    console.log('='.repeat(40));

    // Check for any remaining broken references
    const scripts = await prisma.script.findMany({
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        files: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true
          }
        }
      }
    });

    let brokenCoverImages = 0;
    let brokenFiles = 0;
    let validCoverImages = 0;
    let validFiles = 0;

    for (const script of scripts) {
      // Check cover images
      if (script.coverImageUrl) {
        const fileName = script.coverImageUrl.split('/').pop() || '';
        const filePath = join(process.cwd(), 'uploads', fileName);
        const exists = existsSync(filePath);
        
        if (exists) {
          validCoverImages++;
        } else {
          brokenCoverImages++;
          console.log(`❌ Still broken: Cover image for "${script.title}" - ${fileName}`);
        }
      }

      // Check files
      for (const file of script.files) {
        const fileName = file.fileUrl.split('/').pop() || '';
        const filePath = join(process.cwd(), 'uploads', fileName);
        const exists = existsSync(filePath);
        
        if (exists) {
          validFiles++;
        } else {
          brokenFiles++;
          console.log(`❌ Still broken: File "${file.fileName}" for script "${script.title}"`);
        }
      }
    }

    console.log('\n📊 VALIDATION RESULTS:');
    console.log(`Total scripts: ${scripts.length}`);
    console.log(`Valid cover images: ${validCoverImages}`);
    console.log(`Valid files: ${validFiles}`);
    console.log(`Broken cover images: ${brokenCoverImages}`);
    console.log(`Broken files: ${brokenFiles}`);

    if (brokenCoverImages === 0 && brokenFiles === 0) {
      console.log('\n✅ SUCCESS: All file references are now valid!');
      console.log('Database cleanup was successful.');
    } else {
      console.log('\n⚠️  WARNING: Some broken references still exist.');
      console.log('You may need to run the cleanup script again.');
    }

    // Count scripts that need file re-uploads
    const scriptsNeedingCoverImages = scripts.filter(s => !s.coverImageUrl).length;
    const scriptsNeedingFiles = scripts.filter(s => s.files.length === 0).length;

    console.log('\n📋 RE-UPLOAD NEEDS:');
    console.log(`Scripts without cover images: ${scriptsNeedingCoverImages}`);
    console.log(`Scripts without files: ${scriptsNeedingFiles}`);

  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  validateCleanupResults();
}

export { validateCleanupResults };
