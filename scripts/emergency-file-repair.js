require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function emergencyRepair() {
  console.log('🚨 EMERGENCY FILE SYSTEM REPAIR');
  console.log('=' .repeat(60));
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  let cleanedRecords = 0;
  let preservedRecords = 0;
  
  try {
    // 1. Remove corrupted dummy files from filesystem
    console.log('\n🧹 Step 1: Removing corrupted dummy/test files...');
    
    const corruptedFiles = [
      '1753523028507_WhatsApp_Image_2025-04-12_at_18.05.46_2a80e585.jpg',
      '1753523033625_Carnage-Screenplay.pdf', 
      '1753525029360_Carnage-Screenplay.pdf',
      '1753525061199_vlcsnap-2025-04-16-17h17m37s395.png',
      '1753525821384_Carnage-Screenplay.pdf',
      '1753526686588_anvikshiki_Hand-drawn_style_sketch_of_a_young_Indian_woman_in_h_22dd847b-a618-48eb-867e-37be7e4a9c8c.webp',
      '1753523590354_my-awesome-screenplay.pdf',
      '1753523590361_pitch-presentation.pptx',
      '1753523590368_story-treatment.pdf', 
      '1753523590375_one-line-summary.pdf'
    ];
    
    for (const filename of corruptedFiles) {
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          if (content.includes('dummy') || content.includes('Mock content') || content.length < 100) {
            fs.unlinkSync(filePath);
            console.log(`   🗑️  Removed corrupted file: ${filename}`);
          }
        } catch (error) {
          // Might be binary, skip
        }
      }
    }
    
    // 2. Clean up orphaned database records for missing files
    console.log('\n🔧 Step 2: Cleaning orphaned database records...');
    
    const allDbFiles = await prisma.scriptFile.findMany({
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        script: {
          select: {
            title: true
          }
        }
      }
    });
    
    for (const dbFile of allDbFiles) {
      const filename = path.basename(dbFile.fileUrl);
      const filePath = path.join(uploadsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        // File is missing, remove database record
        await prisma.scriptFile.delete({
          where: { id: dbFile.id }
        });
        console.log(`   🗑️  Removed orphaned record: ${filename} for "${dbFile.script.title}"`);
        cleanedRecords++;
      } else {
        console.log(`   ✅ Preserved: ${filename} for "${dbFile.script.title}"`);
        preservedRecords++;
      }
    }
    
    // 3. Clean up missing cover image references
    console.log('\n🖼️  Step 3: Cleaning orphaned cover image references...');
    
    const scriptsWithCovers = await prisma.script.findMany({
      where: {
        coverImageUrl: { not: null }
      },
      select: {
        id: true,
        title: true,
        coverImageUrl: true
      }
    });
    
    for (const script of scriptsWithCovers) {
      const filename = path.basename(script.coverImageUrl);
      const filePath = path.join(uploadsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        // Cover image missing, remove reference
        await prisma.script.update({
          where: { id: script.id },
          data: { coverImageUrl: null }
        });
        console.log(`   🗑️  Removed missing cover reference for "${script.title}": ${filename}`);
        cleanedRecords++;
      } else {
        console.log(`   ✅ Preserved cover for "${script.title}": ${filename}`);
      }
    }
    
    // 4. Final system state
    console.log('\n📊 Step 4: Final system state...');
    
    const finalFileCount = await prisma.scriptFile.count();
    const finalScriptCount = await prisma.script.count();
    const finalCoverCount = await prisma.script.count({
      where: { coverImageUrl: { not: null } }
    });
    
    console.log(`   Script Files in DB: ${finalFileCount}`);
    console.log(`   Scripts with Covers: ${finalCoverCount}`);
    console.log(`   Total Scripts: ${finalScriptCount}`);
    
    // Check physical files
    const physicalFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).length : 0;
    console.log(`   Physical Files: ${physicalFiles}`);
    
    console.log('\n🎯 REPAIR SUMMARY');
    console.log('=' .repeat(40));
    console.log(`🗑️  Cleaned Orphaned Records: ${cleanedRecords}`);
    console.log(`✅ Preserved Valid Records: ${preservedRecords}`);
    console.log(`📁 Physical Files Remaining: ${physicalFiles}`);
    
    if (cleanedRecords > 0) {
      console.log('\n⚠️  DATABASE CLEANUP COMPLETED');
      console.log('   • Removed orphaned file references');
      console.log('   • Database now matches actual file system');
      console.log('   • Users will no longer see broken download links');
    }
    
    // 5. Generate recovery recommendations
    console.log('\n🚀 RECOVERY PLAN');
    console.log('=' .repeat(40));
    console.log('📧 IMMEDIATE ACTIONS REQUIRED:');
    console.log('   1. Contact users to inform about file loss');
    console.log('   2. Request users to re-upload their files');
    console.log('   3. Fix underlying storage persistence issue');
    console.log('   4. Implement backup system before accepting new uploads');
    console.log('');
    console.log('🔧 TECHNICAL FIXES NEEDED:');
    console.log('   1. Investigate deployment process file handling');
    console.log('   2. Configure persistent storage for uploads directory');
    console.log('   3. Add file existence validation in upload API');
    console.log('   4. Implement automated backup system');
    console.log('   5. Add file integrity monitoring');
    
    return {
      cleaned: cleanedRecords,
      preserved: preservedRecords,
      physicalFiles
    };
    
  } catch (error) {
    console.error('❌ Emergency repair failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run emergency repair
emergencyRepair()
  .then(result => {
    console.log(`\n✅ EMERGENCY REPAIR COMPLETED`);
    console.log(`   Cleaned: ${result.cleaned} orphaned records`);
    console.log(`   Preserved: ${result.preserved} valid records`);
    console.log(`   Physical files: ${result.physicalFiles}`);
    
    if (result.cleaned > 0) {
      console.log('\n🎉 Database is now clean and consistent with file system!');
    }
    
    console.log('\n⚠️  CRITICAL: Fix storage persistence before accepting new uploads!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Emergency repair failed:', error);
    process.exit(1);
  });
