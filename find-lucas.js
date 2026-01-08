const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findLucas() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'lucastgrimera1@gmail.com' }
    });
    
    console.log('Lucas User ID:', user?.id);
    console.log('Accumulated Balance:', user?.accumulatedBalance);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findLucas();
