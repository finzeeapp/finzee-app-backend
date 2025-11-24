import { DatabaseService } from './database.service';

// Importar types localmente
enum ExpenseStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

enum ExpenseCategory {
  HOUSING = 'HOUSING',
  UTILITIES = 'UTILITIES',
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  HEALTHCARE = 'HEALTHCARE',
  ENTERTAINMENT = 'ENTERTAINMENT',
  EDUCATION = 'EDUCATION',
  CLOTHING = 'CLOTHING',
  PERSONAL_CARE = 'PERSONAL_CARE',
  INSURANCE = 'INSURANCE',
  DEBT = 'DEBT',
  SAVINGS = 'SAVINGS',
  OTHER = 'OTHER'
}

interface Dashboard {
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
  private db = DatabaseService.getInstance();

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
    const user = this.db.getUsers().find(u => u.id === userId);
    const expenses = this.db.getExpenses().filter(e => e.userId === userId);
    const investments = this.db.getInvestments().filter(i => i.userId === userId);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const referenceMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Filtrar despesas do mês atual usando referenceMonth
    const monthlyExpenses = expenses.filter(e => e.referenceMonth === referenceMonth);

    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingExpenses = monthlyExpenses
      .filter(e => !e.isPaid)
      .reduce((sum, e) => sum + e.amount, 0);
    const monthlyIncome = user?.monthlyIncome || 0;
    const availableBalance = monthlyIncome - totalExpenses;

    // Calcular total de investimentos (valor atual)
    const totalInvestments = investments.reduce((sum, investment) => {
      const value = investment.currentValue || investment.amount || 0;
      return sum + value;
    }, 0);

    // Próximas despesas (não pagas) ordenadas por data de vencimento
    const upcomingExpensesList = monthlyExpenses
      .filter(e => !e.isPaid)
      .sort((a, b) => {
        const dateA = new Date(a.dueDate || a.createdAt);
        const dateB = new Date(b.dueDate || b.createdAt);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5)
      .map(e => {
        const dueDate = e.dueDate || e.createdAt;
        const status = this.getExpenseStatus(e, dueDate);
        
        return {
          id: e.id,
          title: e.title,
          amount: e.amount,
          dueDate: typeof dueDate === 'string' ? dueDate : dueDate.toISOString(),
          category: e.category,
          status: status as 'pending' | 'paid' | 'overdue'
        };
      });

    return {
      availableBalance: parseFloat(availableBalance.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      pendingExpenses: parseFloat(pendingExpenses.toFixed(2)),
      totalInvestments: parseFloat(totalInvestments.toFixed(2)),
      upcomingExpenses: upcomingExpensesList
    };
  }
}
