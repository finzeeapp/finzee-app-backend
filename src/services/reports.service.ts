import { DatabaseService } from './database.service';

export class ReportsService {
  private db = DatabaseService.getInstance();

  async getMonthlyEvolution(userId: string, months: number = 6) {
    const allExpenses = this.db.getExpenses();
    const expenses = allExpenses.filter((e: any) => e.userId === userId);
    const allUsers = this.db.getUsers();
    const user = allUsers.find((u: any) => u.id === userId);

    const monthlyData = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const referenceMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

      const monthExpenses = expenses.filter((e: any) => e.referenceMonth === referenceMonth);
      const expenses_total = monthExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
      const paid = monthExpenses.filter((e: any) => e.isPaid).reduce((sum: number, e: any) => sum + e.amount, 0);
      const income = user?.monthlyIncome || 0;

      monthlyData.push({
        month: monthName,
        income: parseFloat(income.toFixed(2)),
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
    
    const allExpenses = this.db.getExpenses();
    const expenses = allExpenses.filter((e: any) => 
      e.userId === userId && e.referenceMonth === referenceMonth
    );

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
    const totalAmount = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    expenses.forEach((expense: any) => {
      const category = categoryNames[expense.category] || expense.category;
      if (!categoryData[category]) {
        categoryData[category] = { total: 0, percentage: 0 };
      }
      categoryData[category].total += expense.amount;
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
    
    const allExpenses = this.db.getExpenses();
    const expenses = allExpenses.filter((e: any) => 
      e.userId === userId && e.referenceMonth === referenceMonth
    );

    const typeNames: Record<string, string> = {
      fixa: 'fixed',
      variavel: 'variable',
      parcelada: 'installment'
    };

    const typeData: Record<string, number> = {};

    expenses.forEach((expense: any) => {
      const type = typeNames[expense.type] || expense.type;
      typeData[type] = (typeData[type] || 0) + expense.amount;
    });

    return Object.entries(typeData).map(([type, total]) => ({
      type,
      total: parseFloat(total.toFixed(2))
    }));
  }

  async getIncomeVsExpenses(userId: string, month?: string) {
    const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const allExpenses = this.db.getExpenses();
    const expenses = allExpenses.filter((e: any) => 
      e.userId === userId && e.referenceMonth === currentMonth
    );
    const allUsers = this.db.getUsers();
    const user = allUsers.find((u: any) => u.id === userId);

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const paidExpenses = expenses.filter((e: any) => e.isPaid).reduce((sum: number, e: any) => sum + e.amount, 0);
    const income = user?.monthlyIncome || 0;

    return [
      { name: 'Renda', value: parseFloat(income.toFixed(2)) },
      { name: 'Despesas', value: parseFloat(totalExpenses.toFixed(2)) },
      { name: 'Pagas', value: parseFloat(paidExpenses.toFixed(2)) },
      { name: 'Disponível', value: parseFloat((income - totalExpenses).toFixed(2)) }
    ];
  }

  async getInvestmentsSummary(userId: string) {
    const allInvestments = this.db.getInvestments();
    const investments = allInvestments.filter((i: any) => i.userId === userId);

    const totalInvested = investments.reduce((sum: number, i: any) => sum + (i.investedAmount || i.amount || 0), 0);
    const currentValue = investments.reduce((sum: number, i: any) => sum + (i.currentAmount || i.currentValue || i.amount || 0), 0);
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
