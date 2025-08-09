const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPassword() {
  try {
    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { email: 'venkat@thespiritmedia.com' }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log('✅ User found')
    console.log('- Email:', user.email)
    console.log('- Status:', user.status)
    console.log('- HashedPassword exists:', !!user.hashedPassword)
    
    // Test password
    const isValid = await bcrypt.compare('Bekind@2026', user.hashedPassword)
    console.log('- Password valid:', isValid)
    
    if (!isValid) {
      console.log('🔧 Regenerating password...')
      const newHash = await bcrypt.hash('Bekind@2026', 12)
      await prisma.user.update({
        where: { email: 'venkat@thespiritmedia.com' },
        data: { hashedPassword: newHash }
      })
      console.log('✅ Password updated!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPassword()
