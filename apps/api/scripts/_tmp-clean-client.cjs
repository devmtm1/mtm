const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const email = process.argv[2];
  const u = await prisma.user.findUnique({ where: { email } });
  if (u) {
    await prisma.userRole.deleteMany({ where: { userId: u.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: u.id } });
    console.log('compte client supprimé :', email);
  } else console.log('aucun compte client', email);
  await prisma.$disconnect();
})();
