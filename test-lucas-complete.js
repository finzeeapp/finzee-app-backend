const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLucasDashboard() {
  try {
    // Buscar pelo email
    const user = await prisma.user.findUnique({
      where: { email: 'lucastgrimera1@gmail.com' },
      select: {
        id: true,
        email: true,
        monthlyIncome: true,
        incomeType: true,
        accumulatedBalance: true,
        lastBalanceUpdate: true
      }
    });
    
    if (!user) {
      console.log('Usuário não encontrado');
      return;
    }
    
    const userId = user.id;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const referenceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    
    console.log('=== TESTE COMPLETO - Lucas ===');
    console.log('User ID:', userId);
    console.log('Email:', user.email);
    console.log('Mês de referência:', referenceMonth);
    console.log('\n--- DADOS DO USUÁRIO ---');
    console.log('Renda mensal base:', user.monthlyIncome);
    console.log('Tipo de renda:', user.incomeType);
    console.log('Saldo acumulado no DB:', user.accumulatedBalance);
    console.log('Último update:', user.lastBalanceUpdate);
    
    // Buscar despesas do mês atual
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        referenceMonth,
        isRecurring: false
      }
    });
    
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    console.log('\n--- DESPESAS DO MÊS ---');
    console.log('Quantidade:', expenses.length);
    expenses.forEach(e => {
      console.log(`  ${e.title}: R$ ${e.amount} (pago: ${e.isPaid})`);
    });
    console.log('Total de despesas:', totalExpenses);
    
    // Buscar rendas extras do mês
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
    
    const totalExtraIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    console.log('\n--- RENDAS EXTRAS DO MÊS ---');
    console.log('Quantidade:', incomes.length);
    incomes.forEach(i => {
      console.log(`  ${i.description}: R$ ${i.amount} (${i.date})`);
    });
    console.log('Total de rendas extras:', totalExtraIncome);
    
    // CALCULAR EXATAMENTE COMO O BACKEND FAZ
    const baseIncome = Number(user.monthlyIncome || 0);
    const realIncomeThisMonth = totalExtraIncome;
    const monthlyIncome = baseIncome + realIncomeThisMonth;
    
    const availableBalance = monthlyIncome - totalExpenses;
    const accumulatedBalance = Number(user.accumulatedBalance || 0);
    const finalAvailableBalance = availableBalance + accumulatedBalance;
    
    console.log('\n=== CÁLCULOS (COMO O BACKEND) ===');
    console.log('1. Renda base (monthlyIncome):', baseIncome);
    console.log('2. Renda extra (realIncomeThisMonth):', realIncomeThisMonth);
    console.log('3. Renda total do mês:', monthlyIncome);
    console.log('4. Total de despesas:', totalExpenses);
    console.log('5. availableBalance (3 - 4):', availableBalance);
    console.log('6. accumulatedBalance:', accumulatedBalance);
    console.log('7. finalAvailableBalance (5 + 6):', finalAvailableBalance);
    
    console.log('\n=== O QUE DEVE APARECER NO CARD ===');
    console.log('Saldo deste mês (currentMonthBalance):', availableBalance.toFixed(2));
    console.log('Acumulado anterior (accumulatedBalance):', accumulatedBalance.toFixed(2));
    console.log('Total disponível (availableBalance):', finalAvailableBalance.toFixed(2));
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLucasDashboard();
