import PrismaService from './prisma.service';

export class ReportsService {
  private prisma;
  constructor() {
    this.prisma = PrismaService.getInstance();
  }

  async getMonthlyEvolution(userId: string, months: number = 6) {
    const monthlyData = [];
    const currentDate = new Date();

    // Busca o usuário para pegar a renda mensal
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyIncome: true }
    });

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const referenceMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

      // Busca despesas do usuário para o mês
      const monthExpenses = await this.prisma.expense.findMany({
        where: {
          userId: userId,
          referenceMonth: referenceMonth
        }
      });
      const expenses_total = monthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      const paid = monthExpenses.filter((e: any) => e.isPaid).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      const income = user?.monthlyIncome || 0;

      monthlyData.push({
        month: monthName,
        income: parseFloat(Number(income).toFixed(2)),
        expenses: parseFloat(expenses_total.toFixed(2)),
        paid: parseFloat(paid.toFixed(2))
      });
    }

    return monthlyData;
  }

  async getExpensesByCategory(userId: string, month?: string, year?: string) {
    const now = new Date();
    const currentMonth = month || String(now.getMonth() + 1);
    const currentYear = year || String(now.getFullYear());
    const referenceMonth = `${currentYear}-${currentMonth.padStart(2, '0')}`;

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId: userId,
        referenceMonth: referenceMonth
      }
    });

    const categoryNames: Record<string, string> = {
      alimentacao: 'Alimentação',
      transporte: 'Transporte',
      moradia: 'Moradia',
      saude: 'Saúde',
      educacao: 'Educação',
      lazer: 'Lazer',
      vestuario: 'Vestuário',
      servicos: 'Serviços',
      outros: 'Outros'
    };

    const categoryData: Record<string, { total: number, percentage: number }> = {};
    const totalAmount = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    expenses.forEach((expense: any) => {
      const category = categoryNames[expense.category] || expense.category;
      if (!categoryData[category]) {
        categoryData[category] = { total: 0, percentage: 0 };
      }
      categoryData[category].total += Number(expense.amount);
    });

    // Calcular percentagens
    Object.keys(categoryData).forEach(category => {
      const percentage = totalAmount > 0 ? (categoryData[category].total / totalAmount) * 100 : 0;
      categoryData[category].percentage = parseFloat(percentage.toFixed(1));
    });

    return Object.entries(categoryData).map(([category, data]) => ({
      category,
      total: parseFloat(data.total.toFixed(2)),
      percentage: data.percentage
    }));
  }

  async getExpensesByType(userId: string, month?: string, year?: string) {
    const now = new Date();
    const currentMonth = month || String(now.getMonth() + 1);
    const currentYear = year || String(now.getFullYear());
    const referenceMonth = `${currentYear}-${currentMonth.padStart(2, '0')}`;

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId: userId,
        referenceMonth: referenceMonth
      }
    });

    const typeNames: Record<string, string> = {
      financing: 'financing',
      recurrent: 'recurrent',
      variable: 'variable',
      installment: 'installment'
    };

    const typeData: Record<string, number> = {};

    expenses.forEach((expense: any) => {
      const type = typeNames[expense.type] || expense.type;
      typeData[type] = (typeData[type] || 0) + Number(expense.amount);
    });

    return Object.entries(typeData).map(([type, total]) => ({
      type,
      total: parseFloat(total.toFixed(2))
    }));
  }

  async getIncomeVsExpenses(userId: string, month?: string) {
    const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId: userId,
        referenceMonth: currentMonth
      }
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyIncome: true }
    });

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const paidExpenses = expenses.filter((e: any) => e.isPaid).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const income = user?.monthlyIncome || 0;

    return [
      { name: 'Renda', value: parseFloat(Number(income).toFixed(2)) },
      { name: 'Despesas', value: parseFloat(totalExpenses.toFixed(2)) },
      { name: 'Pagas', value: parseFloat(paidExpenses.toFixed(2)) },
      { name: 'Disponível', value: parseFloat((Number(income) - totalExpenses).toFixed(2)) }
    ];
  }

  async getInvestmentsSummary(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId: userId }
    });

    const totalInvested = investments.reduce((sum: number, i: any) => sum + (Number(i.investedAmount) || Number(i.amount) || 0), 0);
    const currentValue = investments.reduce((sum: number, i: any) => sum + (Number(i.currentAmount) || Number(i.currentValue) || Number(i.amount) || 0), 0);
    const profitability = currentValue - totalInvested;
    const percentage = totalInvested > 0 ? (profitability / totalInvested) * 100 : 0;

    return {
      totalInvested: parseFloat(totalInvested.toFixed(2)),
      currentValue: parseFloat(currentValue.toFixed(2)),
      profitability: parseFloat(profitability.toFixed(2)),
      percentage: parseFloat(percentage.toFixed(2)),
      assetsCount: investments.length
    };
  }

  async getFullReport(userId: string, month?: string) {
    const [
      monthlyEvolution,
      expensesByCategory,
      expensesByType,
      incomeVsExpenses,
      investmentsSummary
    ] = await Promise.all([
      this.getMonthlyEvolution(userId),
      this.getExpensesByCategory(userId, month),
      this.getExpensesByType(userId, month),
      this.getIncomeVsExpenses(userId, month),
      this.getInvestmentsSummary(userId)
    ]);

    return {
      monthlyEvolution,
      expensesByCategory,
      expensesByType,
      incomeVsExpenses,
      investmentsSummary
    };
  }
}
