
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';
import { Storage } from '@/lib/storage';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

// Initialize S3 client for file existence checks
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'scriptrack-files';

interface HealthCheckResult {
  status: 'healthy' | 'issues_found' | 'error';
  summary: {
    totalFiles: number;
    validFiles: number;
    brokenFiles: number;
    successRate: number;
  };
  details: {
    scriptFiles: { total: number; valid: number; broken: number; issues: any[] };
    coverImages: { total: number; valid: number; broken: number; issues: any[] };
    userPhotos: { total: number; valid: number; broken: number; issues: any[] };
  };
  recommendations: string[];
  timestamp: string;
}

async function checkFileExists(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    const key = Storage.extractKeyFromUrl(url);
    if (!key) return false;

    // Check if we're using S3 storage
    const isS3Configured = Storage.isCloudConfigured();
    
    if (isS3Configured) {
      // Check S3 for file existence
      try {
        const command = new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });
        await s3Client.send(command);
        return true;
      } catch (s3Error: any) {
        console.log(`S3 file not found: ${key}`, s3Error.Code);
        return false;
      }
    } else {
      // Check local storage - try both persistent-uploads and uploads-backup
      let filePath = join(process.cwd(), 'persistent-uploads', key);
      
      if (existsSync(filePath)) {
        return true;
      }
      
      // Try legacy uploads-backup directory
      filePath = join(process.cwd(), 'uploads-backup', key);
      return existsSync(filePath);
    }
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can run health checks
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const result: HealthCheckResult = {
      status: 'healthy',
      summary: {
        totalFiles: 0,
        validFiles: 0,
        brokenFiles: 0,
        successRate: 0,
      },
      details: {
        scriptFiles: { total: 0, valid: 0, broken: 0, issues: [] },
        coverImages: { total: 0, valid: 0, broken: 0, issues: [] },
        userPhotos: { total: 0, valid: 0, broken: 0, issues: [] },
      },
      recommendations: [],
      timestamp: new Date().toISOString(),
    };

    // Check Script Files
    const scriptFiles = await prisma.scriptFile.findMany({
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        version: true,
        createdAt: true,
        script: {
          select: { id: true, title: true },
        },
      },
    });

    result.details.scriptFiles.total = scriptFiles.length;
    for (const file of scriptFiles) {
      const exists = await checkFileExists(file.fileUrl);
      if (exists) {
        result.details.scriptFiles.valid++;
      } else {
        result.details.scriptFiles.broken++;
        result.details.scriptFiles.issues.push({
          id: file.id,
          fileName: file.fileName,
          url: file.fileUrl,
          scriptTitle: file.script.title,
          scriptId: file.script.id,
          uploadDate: file.createdAt,
          fileSize: file.fileSize,
          version: file.version,
        });
      }
    }

    // Check Cover Images
    const scriptsWithCovers = await prisma.script.findMany({
      where: { coverImageUrl: { not: null } },
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    result.details.coverImages.total = scriptsWithCovers.length;
    for (const script of scriptsWithCovers) {
      if (script.coverImageUrl) {
        const exists = await checkFileExists(script.coverImageUrl);
        if (exists) {
          result.details.coverImages.valid++;
        } else {
          result.details.coverImages.broken++;
          result.details.coverImages.issues.push({
            id: script.id,
            title: script.title,
            url: script.coverImageUrl,
            createdAt: script.createdAt,
            updatedAt: script.updatedAt,
          });
        }
      }
    }

    // Check User Photos
    const usersWithPhotos = await prisma.user.findMany({
      where: { photoUrl: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    result.details.userPhotos.total = usersWithPhotos.length;
    for (const user of usersWithPhotos) {
      if (user.photoUrl) {
        const exists = await checkFileExists(user.photoUrl);
        if (exists) {
          result.details.userPhotos.valid++;
        } else {
          result.details.userPhotos.broken++;
          result.details.userPhotos.issues.push({
            id: user.id,
            name: user.name,
            email: user.email,
            url: user.photoUrl,
            createdAt: user.createdAt,
          });
        }
      }
    }

    // Calculate summary
    result.summary.totalFiles = result.details.scriptFiles.total + result.details.coverImages.total + result.details.userPhotos.total;
    result.summary.validFiles = result.details.scriptFiles.valid + result.details.coverImages.valid + result.details.userPhotos.valid;
    result.summary.brokenFiles = result.details.scriptFiles.broken + result.details.coverImages.broken + result.details.userPhotos.broken;
    result.summary.successRate = result.summary.totalFiles > 0 
      ? Math.round((result.summary.validFiles / result.summary.totalFiles) * 100) 
      : 100;

    // Determine overall status
    if (result.summary.brokenFiles === 0) {
      result.status = 'healthy';
    } else {
      result.status = 'issues_found';
    }

    // Generate recommendations
    if (result.summary.brokenFiles > 0) {
      result.recommendations.push(`Found ${result.summary.brokenFiles} broken file references that should be cleaned up`);
      
      if (result.details.scriptFiles.broken > 0) {
        result.recommendations.push(`${result.details.scriptFiles.broken} script files are missing and should be re-uploaded or removed from database`);
      }
      
      if (result.details.coverImages.broken > 0) {
        result.recommendations.push(`${result.details.coverImages.broken} cover images are missing and should be re-uploaded or references cleared`);
      }
      
      if (result.details.userPhotos.broken > 0) {
        result.recommendations.push(`${result.details.userPhotos.broken} user profile photos are missing and should be re-uploaded or references cleared`);
      }
      
      result.recommendations.push('Run the automated cleanup script to remove broken references');
      result.recommendations.push('Implement file validation before saving to database in the future');
    } else {
      result.recommendations.push('File system is healthy - all references point to existing files');
      result.recommendations.push('Consider implementing periodic health checks to maintain file integrity');
      result.recommendations.push('Ensure proper backup procedures are in place for uploaded files');
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to perform health check',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
