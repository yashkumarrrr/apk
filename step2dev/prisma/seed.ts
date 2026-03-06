import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')
  const hash = await bcrypt.hash('Test1234!', 12)
  const user = await prisma.user.upsert({
    where: { email: 'test@step2dev.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@step2dev.com',
      passwordHash: hash,
      emailVerified: true,
    },
  })
  console.log(`✅ Test user: ${user.email} / Test1234!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
