import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log('Current Users in Database:')
    console.log('========================')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.name} - Status: ${user.status}`)
    })
    
    console.log(`\nTotal users: ${users.length}`)
    
    // Check for our main admin
    const mainAdmin = users.find(u => u.email === 'venkat@thespiritmedia.com')
    if (mainAdmin) {
      console.log('\n✅ Main admin account found:', mainAdmin.email)
    } else {
      console.log('\n❌ Main admin account NOT found!')
    }
    
  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
