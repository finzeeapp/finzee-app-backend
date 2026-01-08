const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function calculateAccumulatedBalance(userEmail) {
  try {
    console.log(`\n=== CALCULANDO ACUMULADO PARA ${userEmail} ===\n`);
    
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        monthlyIncome: true,
        incomeType: true
      }
    });

    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log('✓ Usuário encontrado:', user.email);
    console.log('  Renda base:', user.monthlyIncome);
    console.log('  Tipo:', user.incomeType);

    // Buscar todas as despesas e rendas
    const allExpenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        isRecurring: false
      },
      orderBy: { referenceMonth: 'asc' }
    });

    const allIncomes = await prisma.income.findMany({
      where: {
        userId: user.id
      },
      orderBy: { date: 'asc' }
    });

    // Agrupar despesas por mês
    const expensesByMonth = new Map();
    allExpenses.forEach(expense => {
      const month = expense.referenceMonth;
      if (!expensesByMonth.has(month)) {
        expensesByMonth.set(month, []);
      }
      expensesByMonth.get(month).push(expense);
    });

    // Agrupar rendas por mês
    const incomesByMonth = new Map();
    allIncomes.forEach(income => {
      const date = new Date(income.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!incomesByMonth.has(month)) {
        incomesByMonth.set(month, []);
      }
      incomesByMonth.get(month).push(income);
    });

    // Obter todos os meses únicos
    const allMonths = new Set([...expensesByMonth.keys(), ...incomesByMonth.keys()]);
    const sortedMonths = Array.from(allMonths).sort();

    // Mês atual
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log('\n📊 HISTÓRICO MENSAL:');
    console.log('─'.repeat(80));

    let accumulatedBalance = 0;
    const baseIncome = Number(user.monthlyIncome || 0);

    for (const month of sortedMonths) {
      // Parar antes do mês atual
      if (month >= currentMonth) break;

      // Calcular despesas do mês
      const monthExpenses = expensesByMonth.get(month) || [];
      const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Calcular rendas extras do mês
      const monthIncomes = incomesByMonth.get(month) || [];
      const totalExtraIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);

      // Renda total do mês
      const totalIncome = baseIncome + totalExtraIncome;

      // Saldo do mês
      const monthBalance = totalIncome - totalExpenses;
      accumulatedBalance += monthBalance;

      console.log(`\n${month}:`);
      console.log(`  Renda base: R$ ${baseIncome.toFixed(2)}`);
      console.log(`  Renda extra: R$ ${totalExtraIncome.toFixed(2)}`);
      console.log(`  Renda total: R$ ${totalIncome.toFixed(2)}`);
      console.log(`  Despesas: R$ ${totalExpenses.toFixed(2)}`);
      console.log(`  Saldo do mês: R$ ${monthBalance.toFixed(2)} ${monthBalance >= 0 ? '✓' : '✗'}`);
      console.log(`  Acumulado até aqui: R$ ${accumulatedBalance.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`💰 SALDO ACUMULADO TOTAL: R$ ${accumulatedBalance.toFixed(2)}`);
    console.log('='.repeat(80));

    // Atualizar no banco de dados
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accumulatedBalance: accumulatedBalance,
        lastBalanceUpdate: currentMonth
      }
    });

    console.log('\n✅ Saldo acumulado atualizado no banco de dados!');
    
    return accumulatedBalance;

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function main() {
  try {
    console.log('🚀 INICIANDO CÁLCULO DE SALDO ACUMULADO\n');

    // Calcular para os dois usuários
    await calculateAccumulatedBalance('lucastgrimera1@gmail.com');
    await calculateAccumulatedBalance('eduardaelisadasilva@gmail.com');

    console.log('\n✅ PROCESSO CONCLUÍDO!\n');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
