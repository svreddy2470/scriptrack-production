const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('Bekind@2026', 12)
    
    // Create admin user with correct field names
    const admin = await prisma.user.create({
      data: {
        email: 'venkat@thespiritmedia.com',
        hashedPassword: hashedPassword,  // Changed from 'password' to 'hashedPassword'
        role: 'ADMIN',
        name: 'Admin User',
        status: 'ACTIVE',
        isProfileComplete: false
      }
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('Email: venkat@thespiritmedia.com')
    console.log('Password: Bekind@2026')
    
  } catch (error) {
    console.error('❌ Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
