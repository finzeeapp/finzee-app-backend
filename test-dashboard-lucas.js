const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboard() {
  try {
    const userId = '4df99a6d-f73c-420a-97b7-c98bb59abf2c'; // Lucas
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const referenceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    
    console.log('=== TESTE DASHBOARD - Lucas ===');
    console.log('Mês:', referenceMonth);
    
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        monthlyIncome: true,
        incomeType: true,
        accumulatedBalance: true,
        lastBalanceUpdate: true
      }
    });
    
    console.log('\nUsuário:');
    console.log('  Renda mensal:', user.monthlyIncome);
    console.log('  Tipo:', user.incomeType);
    console.log('  Acumulado:', user.accumulatedBalance);
    console.log('  Último update:', user.lastBalanceUpdate);
    
    // Buscar despesas
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        referenceMonth,
        isRecurring: false
      }
    });
    
    console.log('\nDespesas:');
    console.log('  Quantidade:', expenses.length);
    expenses.forEach(e => {
      console.log(`  - ${e.title}: R$ ${e.amount}`);
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    console.log('  TOTAL:', totalExpenses);
    
    // Buscar rendas extras
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    
    console.log('\nRendas extras:');
    console.log('  Quantidade:', incomes.length);
    incomes.forEach(i => {
      console.log(`  - ${i.description}: R$ ${i.amount}`);
    });
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    console.log('  TOTAL:', totalIncome);
    
    // Calcular
    const baseIncome = Number(user.monthlyIncome || 0);
    const monthlyIncome = baseIncome + totalIncome;
    const currentMonthBalance = monthlyIncome - totalExpenses;
    const accumulatedBalance = Number(user.accumulatedBalance || 0);
    const finalBalance = currentMonthBalance + accumulatedBalance;
    
    console.log('\n=== RESULTADO ===');
    console.log('Renda base:', baseIncome);
    console.log('Renda extra:', totalIncome);
    console.log('Renda total:', monthlyIncome);
    console.log('Despesas:', totalExpenses);
    console.log('---');
    console.log('Saldo deste mês:', currentMonthBalance);
    console.log('Acumulado anterior:', accumulatedBalance);
    console.log('TOTAL DISPONÍVEL:', finalBalance);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboard();
