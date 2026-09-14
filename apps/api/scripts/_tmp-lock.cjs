const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const u = await prisma.user.findUnique({ where: { email: 'test-administrateur@mtm.test' }, select: { id: true, failedLoginAttempts: true, lockedUntil: true, twoFactorEnabled: true } });
  console.log(JSON.stringify(u));
  const logs = await prisma.auditLog.findMany({ where: { userId: u.id, action: { startsWith: 'auth.' } }, orderBy: { createdAt: 'desc' }, take: 8, select: { createdAt: true, action: true } });
  console.log(logs.map((l) => `${l.createdAt.toISOString().slice(11, 19)} ${l.action}`).join('\n'));
  if (process.argv[2] === 'unlock') {
    await prisma.user.update({ where: { id: u.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    console.log('déverrouillé');
  }
  await prisma.$disconnect();
})();
