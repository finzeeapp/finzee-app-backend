import { prisma } from './prisma.service';

interface Dashboard {
  monthlyIncome: number;
  availableBalance: number;
  totalExpenses: number;
  pendingExpenses: number;
  totalInvestments: number;
  upcomingExpenses: Array<{
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    category: string;
    status: 'pending' | 'paid' | 'overdue';
  }>;
}

export class DashboardService {

  private getExpenseStatus(expense: any, dueDate: string | Date): string {
    if (expense.isPaid) {
      return 'paid';
    }
    
    const today = new Date();
    const due = new Date(dueDate);
    
    if (due < today) {
      return 'overdue';
    }
    
    return 'pending';
  }

  async getMonthlyDashboard(userId: string): Promise<Dashboard> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const referenceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Buscar despesas do mês atual
    const monthlyExpenses = await prisma.expense.findMany({
      where: {
        userId,
        referenceMonth,
        isRecurring: false
      }
    });

    // Buscar investimentos
    const investments = await prisma.investment.findMany({
      where: { userId }
    });

    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const pendingExpenses = monthlyExpenses
      .filter(e => !e.isPaid)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const monthlyIncome = Number(user?.monthlyIncome) || 0;
    const availableBalance = monthlyIncome - totalExpenses;

    // Calcular total de investimentos (valor atual)
    const totalInvestments = investments.reduce((sum, investment) => {
      const value = Number(investment.currentValue || investment.amount || 0);
      return sum + value;
    }, 0);

    // Próximas despesas (não pagas) ordenadas por data de vencimento
    const upcomingExpensesList = monthlyExpenses
      .filter(e => !e.isPaid)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5)
      .map(e => {
        const status = this.getExpenseStatus(e, e.dueDate);
        
        return {
          id: e.id,
          title: e.title,
          amount: Number(e.amount),
          dueDate: e.dueDate.toISOString(),
          category: e.category,
          status: status as 'pending' | 'paid' | 'overdue'
        };
      });

    return {
      monthlyIncome: parseFloat(monthlyIncome.toFixed(2)),
      availableBalance: parseFloat(availableBalance.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      pendingExpenses: parseFloat(pendingExpenses.toFixed(2)),
      totalInvestments: parseFloat(totalInvestments.toFixed(2)),
      upcomingExpenses: upcomingExpensesList
    };
  }
}
