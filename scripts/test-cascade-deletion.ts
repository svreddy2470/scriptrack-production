import { prisma } from '../lib/db';

async function testDeletionProcess() {
  console.log('🧪 TESTING SCRIPT DELETION AND CASCADE BEHAVIOR...\n');
  
  try {
    // Step 1: Create a test script
    console.log('1️⃣ Creating test script...');
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      throw new Error('No admin user found for testing');
    }
    
    const testScript = await prisma.script.create({
      data: {
        title: 'CASCADE_TEST_SCRIPT',
        writers: 'Test Writer',
        phone: '123-456-7890',
        email: 'test@example.com',
        type: 'FEATURE_FILM',
        developmentStatus: 'FIRST_DRAFT',
        logline: 'Test logline for cascade deletion testing',
        synopsis: 'Test synopsis for cascade deletion testing',
        submittedBy: adminUser.id
      }
    });
    console.log('✅ Test script created:', { id: testScript.id, title: testScript.title });
    
    // Step 2: Create related records
    console.log('\n2️⃣ Creating related records...');
    
    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        scriptId: testScript.id,
        assignedTo: adminUser.id,
        assignedBy: adminUser.id,
        notes: 'Test assignment for cascade deletion'
      }
    });
    console.log('✅ Assignment created:', assignment.id);
    
    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        scriptId: testScript.id,
        userId: adminUser.id,
        comments: 'Test feedback for cascade deletion',
        category: 'GENERAL'
      }
    });
    console.log('✅ Feedback created:', feedback.id);
    
    // Create activity
    const activity = await prisma.activity.create({
      data: {
        scriptId: testScript.id,
        userId: adminUser.id,
        type: 'SCRIPT_SUBMITTED',
        title: 'Test Activity',
        description: 'Test activity for cascade deletion'
      }
    });
    console.log('✅ Activity created:', activity.id);
    
    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        scriptId: testScript.id,
        title: 'Test Meeting',
        description: 'Test meeting for cascade deletion',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        scheduledBy: adminUser.id
      }
    });
    console.log('✅ Meeting created:', meeting.id);
    
    // Step 3: Count related records before deletion
    console.log('\n3️⃣ Counting related records before deletion...');
    const beforeCounts = {
      assignments: await prisma.assignment.count({ where: { scriptId: testScript.id } }),
      feedback: await prisma.feedback.count({ where: { scriptId: testScript.id } }),
      activities: await prisma.activity.count({ where: { scriptId: testScript.id } }),
      meetings: await prisma.meeting.count({ where: { scriptId: testScript.id } })
    };
    console.log('📊 Related records before deletion:', beforeCounts);
    
    // Step 4: Delete the script (using same method as the API)
    console.log('\n4️⃣ Deleting test script using API deletion method...');
    await prisma.script.delete({
      where: { id: testScript.id }
    });
    console.log('✅ Script deleted successfully');
    
    // Step 5: Count related records after deletion
    console.log('\n5️⃣ Counting related records after deletion...');
    const afterCounts = {
      assignments: await prisma.assignment.count({ where: { scriptId: testScript.id } }),
      feedback: await prisma.feedback.count({ where: { scriptId: testScript.id } }),
      activities: await prisma.activity.count({ where: { scriptId: testScript.id } }),
      meetings: await prisma.meeting.count({ where: { scriptId: testScript.id } })
    };
    console.log('📊 Related records after deletion:', afterCounts);
    
    // Step 6: Verify cascade worked
    console.log('\n6️⃣ Cascade deletion verification:');
    const totalBefore = Object.values(beforeCounts).reduce((a, b) => a + b, 0);
    const totalAfter = Object.values(afterCounts).reduce((a, b) => a + b, 0);
    
    if (totalAfter === 0 && totalBefore > 0) {
      console.log('✅ CASCADE DELETION WORKING PERFECTLY!');
      console.log(`   🎯 Removed ${totalBefore} related records automatically`);
      console.log('   📋 Breakdown:');
      Object.entries(beforeCounts).forEach(([key, count]) => {
        console.log(`   - ${key}: ${count} → 0`);
      });
    } else {
      console.log('❌ CASCADE DELETION FAILED!');
      console.log(`   Expected 0 remaining records, found ${totalAfter}`);
      if (totalAfter > 0) {
        console.log('   🚨 Remaining orphaned records:');
        Object.entries(afterCounts).forEach(([key, count]) => {
          if (count > 0) console.log(`   - ${key}: ${count}`);
        });
      }
    }
    
    return { beforeCounts, afterCounts, success: totalAfter === 0 };
    
  } catch (error) {
    console.error('❌ Error during deletion test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDeletionProcess().catch(console.error);
