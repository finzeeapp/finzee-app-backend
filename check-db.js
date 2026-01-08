const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        monthlyIncome: true,
        accumulatedBalance: true,
        lastBalanceUpdate: true
      }
    });
    
    console.log('=== TODOS OS USUÁRIOS ===');
    users.forEach(user => {
      console.log('\n---');
      console.log('Email:', user.email);
      console.log('Renda mensal:', user.monthlyIncome);
      console.log('Saldo acumulado:', user.accumulatedBalance);
      console.log('Último update:', user.lastBalanceUpdate);
    });
    
    // Verificar a estrutura da tabela
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('accumulated_balance', 'last_balance_update', 'accumulatedBalance', 'lastBalanceUpdate')
      ORDER BY column_name;
    `;
    
    console.log('\n=== ESTRUTURA DA TABELA ===');
    console.log(result);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
