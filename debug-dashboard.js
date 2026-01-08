const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDashboard() {
  try {
    // Pegar o primeiro usuário
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('Nenhum usuário encontrado');
      return;
    }

    console.log('=== DEBUG DASHBOARD ===');
    console.log('User ID:', user.id);
    console.log('Renda mensal:', user.monthlyIncome);
    console.log('Tipo de renda:', user.incomeType);
    console.log('Saldo acumulado:', user.accumulatedBalance);
    console.log('Último update:', user.lastBalanceUpdate);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const referenceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    
    console.log('\nMês de referência:', referenceMonth);
    
    // Buscar despesas do mês atual
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        referenceMonth,
        isRecurring: false
      }
    });
    
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    console.log('\nTotal de despesas:', totalExpenses);
    console.log('Quantidade de despesas:', expenses.length);
    
    // Buscar rendas do mês
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    const incomes = await prisma.income.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    console.log('\nTotal de renda extra do mês:', totalIncome);
    console.log('Quantidade de entradas:', incomes.length);
    
    // Calcular saldo do mês
    const monthlyIncome = Number(user.monthlyIncome || 0);
    const totalMonthIncome = monthlyIncome + totalIncome;
    const currentMonthBalance = totalMonthIncome - totalExpenses;
    
    console.log('\n=== CÁLCULOS ===');
    console.log('Renda base:', monthlyIncome);
    console.log('Renda extra:', totalIncome);
    console.log('Renda total do mês:', totalMonthIncome);
    console.log('Despesas totais:', totalExpenses);
    console.log('Saldo do mês atual:', currentMonthBalance);
    console.log('Saldo acumulado anterior:', user.accumulatedBalance);
    console.log('Total disponível:', currentMonthBalance + Number(user.accumulatedBalance || 0));
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDashboard();
