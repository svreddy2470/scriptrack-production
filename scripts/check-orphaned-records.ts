import { prisma } from '../lib/db';

async function checkOrphanedRecords() {
  console.log('🔍 CHECKING FOR ORPHANED RECORDS...\n');
  
  try {
    // Get all script IDs that exist
    const scripts = await prisma.script.findMany({ select: { id: true, title: true } });
    const scriptIds = new Set(scripts.map(s => s.id));
    console.log(`📋 Found ${scripts.length} scripts in database`);
    
    // Check assignments
    const assignments = await prisma.assignment.findMany({ 
      select: { id: true, scriptId: true }
    });
    const orphanedAssignments = assignments.filter(a => !scriptIds.has(a.scriptId));
    console.log(`📝 Assignments: ${assignments.length} total, ${orphanedAssignments.length} orphaned`);
    
    // Check feedback
    const feedback = await prisma.feedback.findMany({ 
      select: { id: true, scriptId: true }
    });
    const orphanedFeedback = feedback.filter(f => !scriptIds.has(f.scriptId));
    console.log(`💬 Feedback: ${feedback.length} total, ${orphanedFeedback.length} orphaned`);
    
    // Check activities
    const activities = await prisma.activity.findMany({ 
      select: { id: true, scriptId: true }
    });
    const orphanedActivities = activities.filter(a => !scriptIds.has(a.scriptId));
    console.log(`📊 Activities: ${activities.length} total, ${orphanedActivities.length} orphaned`);
    
    // Check meetings
    const meetings = await prisma.meeting.findMany({ 
      select: { id: true, scriptId: true }
    });
    const orphanedMeetings = meetings.filter(m => !scriptIds.has(m.scriptId));
    console.log(`🤝 Meetings: ${meetings.length} total, ${orphanedMeetings.length} orphaned`);
    
    // Check script files
    const scriptFiles = await prisma.scriptFile.findMany({ 
      select: { id: true, scriptId: true }
    });
    const orphanedFiles = scriptFiles.filter(f => !scriptIds.has(f.scriptId));
    console.log(`📄 Script Files: ${scriptFiles.length} total, ${orphanedFiles.length} orphaned`);
    
    console.log('\n📋 DETAILED ORPHANED RECORDS:');
    if (orphanedAssignments.length > 0) {
      console.log('🚨 Orphaned Assignments:', orphanedAssignments.map(a => ({ id: a.id, scriptId: a.scriptId })));
    }
    if (orphanedFeedback.length > 0) {
      console.log('🚨 Orphaned Feedback:', orphanedFeedback.map(f => ({ id: f.id, scriptId: f.scriptId })));
    }
    if (orphanedActivities.length > 0) {
      console.log('🚨 Orphaned Activities:', orphanedActivities.map(a => ({ id: a.id, scriptId: a.scriptId })));
    }
    if (orphanedMeetings.length > 0) {
      console.log('🚨 Orphaned Meetings:', orphanedMeetings.map(m => ({ id: m.id, scriptId: m.scriptId })));
    }
    if (orphanedFiles.length > 0) {
      console.log('🚨 Orphaned Files:', orphanedFiles.map(f => ({ id: f.id, scriptId: f.scriptId })));
    }
    
    const totalOrphaned = orphanedAssignments.length + orphanedFeedback.length + orphanedActivities.length + orphanedMeetings.length + orphanedFiles.length;
    console.log(`\n🎯 TOTAL ORPHANED RECORDS: ${totalOrphaned}`);
    
    if (totalOrphaned === 0) {
      console.log('✅ No orphaned records found! Database integrity is maintained.');
    } else {
      console.log('⚠️  Found orphaned records that need cleanup!');
    }
    
    return {
      totalScripts: scripts.length,
      totalOrphaned,
      details: {
        assignments: orphanedAssignments.length,
        feedback: orphanedFeedback.length,  
        activities: orphanedActivities.length,
        meetings: orphanedMeetings.length,
        files: orphanedFiles.length
      }
    };
  } catch (error) {
    console.error('❌ Error checking records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkOrphanedRecords().catch(console.error);
