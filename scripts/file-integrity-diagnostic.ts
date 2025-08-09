
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';
import { Storage } from '../lib/storage';

const prisma = new PrismaClient();

interface FileIssue {
  table: string;
  id: string;
  field: string;
  url: string;
  exists: boolean;
  issue: string;
}

interface DiagnosticReport {
  totalFiles: number;
  validFiles: number;
  brokenFiles: number;
  issues: FileIssue[];
  summary: {
    scriptFiles: { total: number; valid: number; broken: number };
    coverImages: { total: number; valid: number; broken: number };
    userPhotos: { total: number; valid: number; broken: number };
  };
}

async function checkFileExists(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    // Extract key/filename from URL
    const key = Storage.extractKeyFromUrl(url);
    if (!key) return false;

    // Check if file exists locally (since we're using local storage)
    const filePath = join(process.cwd(), 'uploads', key);
    return existsSync(filePath);
  } catch (error) {
    return false;
  }
}

async function runDiagnostic(): Promise<DiagnosticReport> {
  console.log('🔍 Starting File Integrity Diagnostic...\n');

  const issues: FileIssue[] = [];
  const report: DiagnosticReport = {
    totalFiles: 0,
    validFiles: 0,
    brokenFiles: 0,
    issues: [],
    summary: {
      scriptFiles: { total: 0, valid: 0, broken: 0 },
      coverImages: { total: 0, valid: 0, broken: 0 },
      userPhotos: { total: 0, valid: 0, broken: 0 },
    },
  };

  // Check Script Files
  console.log('📄 Checking ScriptFile records...');
  const scriptFiles = await prisma.scriptFile.findMany({
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      script: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  report.summary.scriptFiles.total = scriptFiles.length;
  for (const file of scriptFiles) {
    const exists = await checkFileExists(file.fileUrl);
    if (exists) {
      report.summary.scriptFiles.valid++;
    } else {
      report.summary.scriptFiles.broken++;
      issues.push({
        table: 'ScriptFile',
        id: file.id,
        field: 'fileUrl',
        url: file.fileUrl,
        exists: false,
        issue: `Script "${file.script.title}" - File "${file.fileName}" not found`,
      });
    }
  }

  // Check Cover Images
  console.log('🖼️  Checking Script cover images...');
  const scriptsWithCovers = await prisma.script.findMany({
    where: {
      coverImageUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
    },
  });

  report.summary.coverImages.total = scriptsWithCovers.length;
  for (const script of scriptsWithCovers) {
    if (script.coverImageUrl) {
      const exists = await checkFileExists(script.coverImageUrl);
      if (exists) {
        report.summary.coverImages.valid++;
      } else {
        report.summary.coverImages.broken++;
        issues.push({
          table: 'Script',
          id: script.id,
          field: 'coverImageUrl',
          url: script.coverImageUrl,
          exists: false,
          issue: `Script "${script.title}" - Cover image not found`,
        });
      }
    }
  }

  // Check User Photos
  console.log('👤 Checking User profile photos...');
  const usersWithPhotos = await prisma.user.findMany({
    where: {
      photoUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      photoUrl: true,
    },
  });

  report.summary.userPhotos.total = usersWithPhotos.length;
  for (const user of usersWithPhotos) {
    if (user.photoUrl) {
      const exists = await checkFileExists(user.photoUrl);
      if (exists) {
        report.summary.userPhotos.valid++;
      } else {
        report.summary.userPhotos.broken++;
        issues.push({
          table: 'User',
          id: user.id,
          field: 'photoUrl',
          url: user.photoUrl,
          exists: false,
          issue: `User "${user.name || user.email}" - Profile photo not found`,
        });
      }
    }
  }

  // Calculate totals
  report.totalFiles = report.summary.scriptFiles.total + report.summary.coverImages.total + report.summary.userPhotos.total;
  report.validFiles = report.summary.scriptFiles.valid + report.summary.coverImages.valid + report.summary.userPhotos.valid;
  report.brokenFiles = report.summary.scriptFiles.broken + report.summary.coverImages.broken + report.summary.userPhotos.broken;
  report.issues = issues;

  return report;
}

async function printReport(report: DiagnosticReport) {
  console.log('\n📊 FILE INTEGRITY DIAGNOSTIC REPORT');
  console.log('====================================\n');

  console.log(`📈 OVERVIEW:`);
  console.log(`   Total Files: ${report.totalFiles}`);
  console.log(`   ✅ Valid Files: ${report.validFiles}`);
  console.log(`   ❌ Broken Files: ${report.brokenFiles}`);
  console.log(`   Success Rate: ${((report.validFiles / report.totalFiles) * 100).toFixed(1)}%\n`);

  console.log(`📄 SCRIPT FILES:`);
  console.log(`   Total: ${report.summary.scriptFiles.total}`);
  console.log(`   Valid: ${report.summary.scriptFiles.valid}`);
  console.log(`   Broken: ${report.summary.scriptFiles.broken}\n`);

  console.log(`🖼️  COVER IMAGES:`);
  console.log(`   Total: ${report.summary.coverImages.total}`);
  console.log(`   Valid: ${report.summary.coverImages.valid}`);
  console.log(`   Broken: ${report.summary.coverImages.broken}\n`);

  console.log(`👤 USER PHOTOS:`);
  console.log(`   Total: ${report.summary.userPhotos.total}`);
  console.log(`   Valid: ${report.summary.userPhotos.valid}`);
  console.log(`   Broken: ${report.summary.userPhotos.broken}\n`);

  if (report.issues.length > 0) {
    console.log(`🚨 BROKEN FILE DETAILS:`);
    console.log('=======================\n');
    
    report.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.table} - ${issue.issue}`);
      console.log(`   ID: ${issue.id}`);
      console.log(`   URL: ${issue.url}`);
      console.log('');
    });
  } else {
    console.log('🎉 No broken files found! All file references are valid.\n');
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS:');
  console.log('===================\n');
  
  if (report.brokenFiles > 0) {
    console.log('1. Run the automated cleanup script to remove broken references');
    console.log('2. Implement admin file management interface');
    console.log('3. Add file validation before saving to database');
    console.log('4. Consider implementing file backup/restore procedures\n');
  } else {
    console.log('1. Implement preventive measures to avoid future broken links');
    console.log('2. Add admin file management interface for ongoing maintenance');
    console.log('3. Set up periodic file integrity checks\n');
  }
}

async function main() {
  try {
    const report = await runDiagnostic();
    await printReport(report);
    
    // Save report to file
    const fs = await import('fs/promises');
    await fs.writeFile(
      join(process.cwd(), 'file-integrity-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('📝 Report saved to file-integrity-report.json');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
