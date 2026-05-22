import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@fileshare.local'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin1234'

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    console.log(`✓ Admin user already exists (${adminEmail})`)
    return
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
      quotaBytes: BigInt(107_374_182_400), // 100 GB
    },
  })

  console.log(`✓ Admin user created: ${adminEmail} / ${adminPassword}`)
  console.log('  → Change the password immediately after first login!')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
