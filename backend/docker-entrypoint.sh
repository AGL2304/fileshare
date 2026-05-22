#!/bin/sh
set -e

echo "→ Running database seed (idempotent)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const prisma = new PrismaClient();
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@fileshare.local';
    const password = process.env.ADMIN_PASSWORD || 'Admin1234';
    const hash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Re-set password to match env (idempotent for dev convenience)
      await prisma.user.update({
        where: { email },
        data: { passwordHash: hash, role: 'ADMIN', isActive: true },
      });
      console.log('  ✓ Admin user password reset:', email);
    } else {
      await prisma.user.create({
        data: { email, passwordHash: hash, name: 'Admin', role: 'ADMIN', quotaBytes: 107374182400n },
      });
      console.log('  ✓ Admin user created:', email);
    }
  } catch (err) {
    console.warn('  ⚠ Seed step failed:', err.message);
  } finally {
    await prisma.\$disconnect();
  }
})();
"

echo "→ Starting server..."
exec node dist/app.js
