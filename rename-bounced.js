const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameBounced() {
  try {
    console.log('🔄 Renomeando email_bounced para emailBounced...');
    
    await prisma.$executeRaw`ALTER TABLE users RENAME COLUMN email_bounced TO "emailBounced"`;
    
    console.log('✅ Coluna renomeada!');
    
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('emailBounced', 'emailVerified')
      ORDER BY column_name;
    `;
    
    console.log('\n📋 Colunas verificadas:');
    console.table(result);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

renameBounced();
