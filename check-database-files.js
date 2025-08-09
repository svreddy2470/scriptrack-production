require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkDatabaseFiles() {
  const prisma = new PrismaClient();
  
  try {
    console.log("=== DATABASE FILE REFERENCES AUDIT ===");
    
    // Check Script table for file references
    const scripts = await prisma.script.findMany({
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        createdAt: true,
        submittedBy: true,
        user: {
          select: {
            email: true
          }
        },
        files: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            fileSize: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`\nFound ${scripts.length} script records:`);
    scripts.forEach(script => {
      console.log(`ID: ${script.id}, Title: ${script.title}`);
      console.log(`  Cover Image: ${script.coverImageUrl || 'None'}`);
      console.log(`  Submitted By: ${script.user.email}`);
      console.log(`  Files Count: ${script.files.length}`);
      script.files.forEach(file => {
        console.log(`    - ${file.fileType}: ${file.fileName} (${file.fileSize} bytes)`);
        console.log(`      URL: ${file.fileUrl}`);
      });
      console.log(`  Created: ${script.createdAt}`);
      console.log('---');
    });
    
    // Check total file counts
    const totalScriptFiles = await prisma.scriptFile.count();
    console.log(`\n=== TOTAL DATABASE FILE RECORDS: ${totalScriptFiles} ===`);
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseFiles();
