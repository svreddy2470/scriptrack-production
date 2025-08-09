
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Storage } from '@/lib/storage';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can delete files
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { fileId, fileType } = await request.json();

    if (!fileId || !fileType) {
      return NextResponse.json(
        { error: 'File ID and type are required' },
        { status: 400 }
      );
    }

    // Handle different file types
    let deletedItem = null;
    let activityDetails = '';

    if (fileType === 'script_file') {
      // Delete script file
      const scriptFile = await prisma.scriptFile.findUnique({
        where: { id: fileId },
        include: {
          script: { select: { title: true } },
        },
      });

      if (!scriptFile) {
        return NextResponse.json(
          { error: 'Script file not found' },
          { status: 404 }
        );
      }

      // Extract key from URL and delete from storage
      const key = Storage.extractKeyFromUrl(scriptFile.fileUrl);
      if (key) {
        try {
          await Storage.deleteFile(key);
        } catch (error) {
          console.warn('Failed to delete file from storage:', error);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      deletedItem = await prisma.scriptFile.delete({
        where: { id: fileId },
      });

      activityDetails = `Deleted script file "${scriptFile.fileName}" from "${scriptFile.script.title}"`;

    } else if (fileType === 'cover_image') {
      // Delete cover image
      const script = await prisma.script.findUnique({
        where: { id: fileId },
        select: { id: true, title: true, coverImageUrl: true },
      });

      if (!script?.coverImageUrl) {
        return NextResponse.json(
          { error: 'Cover image not found' },
          { status: 404 }
        );
      }

      // Extract key from URL and delete from storage
      const key = Storage.extractKeyFromUrl(script.coverImageUrl);
      if (key) {
        try {
          await Storage.deleteFile(key);
        } catch (error) {
          console.warn('Failed to delete cover image from storage:', error);
          // Continue with database update even if storage deletion fails
        }
      }

      // Clear cover image URL from database
      deletedItem = await prisma.script.update({
        where: { id: fileId },
        data: { coverImageUrl: null },
      });

      activityDetails = `Deleted cover image from script "${script.title}"`;

    } else if (fileType === 'user_photo') {
      // Delete user profile photo
      const user = await prisma.user.findUnique({
        where: { id: fileId },
        select: { id: true, name: true, email: true, photoUrl: true },
      });

      if (!user?.photoUrl) {
        return NextResponse.json(
          { error: 'User photo not found' },
          { status: 404 }
        );
      }

      // Extract key from URL and delete from storage
      const key = Storage.extractKeyFromUrl(user.photoUrl);
      if (key) {
        try {
          await Storage.deleteFile(key);
        } catch (error) {
          console.warn('Failed to delete user photo from storage:', error);
          // Continue with database update even if storage deletion fails
        }
      }

      // Clear photo URL from database
      deletedItem = await prisma.user.update({
        where: { id: fileId },
        data: { photoUrl: null },
      });

      activityDetails = `Deleted profile photo for user "${user.name || user.email}"`;

    } else {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Log the deletion activity (only for script-related files)
    if (fileType === 'script_file' || fileType === 'cover_image') {
      const scriptId = fileType === 'script_file' 
        ? (deletedItem as any).scriptId 
        : fileId; // For cover images, fileId is actually the script ID

      if (scriptId) {
        await prisma.activity.create({
          data: {
            scriptId,
            userId: session.user.id,
            type: 'FILE_UPLOADED', // Reusing existing enum value for file operations
            title: 'File Deleted',
            description: activityDetails,
            metadata: {
              fileId,
              fileType,
              deletedBy: session.user.email,
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    }
    // Note: User photo deletions don't create activity logs since they're not script-related

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      fileType,
      fileId,
    });

  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
