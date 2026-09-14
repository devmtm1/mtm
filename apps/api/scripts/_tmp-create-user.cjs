const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const [roleName, email, firstName, lastName, plain] = process.argv.slice(2);
(async () => {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName }, include: { permissions: { include: { permission: true } } } });
  console.log(`permissions ${roleName} :`, role.permissions.map((p) => p.permission.name).sort().join(', '));
  const password = await bcrypt.hash(plain, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password, isActive: true, mustChangePassword: false, twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: null, failedLoginAttempts: 0, lockedUntil: null },
    create: { email, firstName, lastName, password, isActive: true, mustChangePassword: false, roles: { create: { roleId: role.id } } },
  });
  await prisma.userRole.deleteMany({ where: { userId: user.id, roleId: { not: role.id } } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
  console.log('created', user.id);
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
