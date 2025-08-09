
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cleanupBrokenFiles } from '@/scripts/automated-file-cleanup';
import type { CleanupResult } from '@/scripts/automated-file-cleanup';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can run cleanup
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Run the cleanup operation
    const result = await cleanupBrokenFiles();

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      ...result,
    });

  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup operation' },
      { status: 500 }
    );
  }
}
