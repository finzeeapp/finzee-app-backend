import { prisma } from './prisma.service';
import { IncomeService } from './income.service';

interface Dashboard {
  // Renda
  incomeType: string; // FIXED ou VARIABLE
  monthlyIncome: number; // Renda fixa ou renda estimada
  realIncomeThisMonth?: number; // Renda real acumulada (apenas para VARIABLE)
  averageMonthlyIncome?: number; // Média mensal (apenas para VARIABLE)
  
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
  private incomeService = new IncomeService();

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
      where: { id: userId },
      select: {
        monthlyIncome: true,
        monthlyInvestmentCapacity: true,
        incomeType: true,
        estimatedMonthlyIncome: true
      }
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

    // Calcular renda baseado no tipo
    const incomeType = user?.incomeType || 'FIXED';
    let monthlyIncome = 0;
    let realIncomeThisMonth: number | undefined;
    let averageMonthlyIncome: number | undefined;

    if (incomeType === 'FIXED') {
      // Renda fixa: usar monthlyIncome cadastrado
      monthlyIncome = Number(user?.monthlyIncome) || 0;
    } else {
      // Renda variável: usar estimativa + calcular renda real
      monthlyIncome = Number(user?.estimatedMonthlyIncome) || 0;
      realIncomeThisMonth = await this.incomeService.getRealIncomeThisMonth(userId);
      
      const stats = await this.incomeService.getStats(userId);
      averageMonthlyIncome = stats.averageMonthly;
    }

    const availableBalance = (realIncomeThisMonth || monthlyIncome) - totalExpenses;

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
        
        // Formatar data como YYYY-MM-DD para evitar problemas de timezone
        const year = e.dueDate.getFullYear();
        const month = String(e.dueDate.getMonth() + 1).padStart(2, '0');
        const day = String(e.dueDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        return {
          id: e.id,
          title: e.title,
          amount: Number(e.amount),
          dueDate: dateString,
          category: e.category,
          status: status as 'pending' | 'paid' | 'overdue'
        };
      });

    const dashboard: Dashboard = {
      incomeType,
      monthlyIncome: parseFloat(monthlyIncome.toFixed(2)),
      availableBalance: parseFloat(availableBalance.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      pendingExpenses: parseFloat(pendingExpenses.toFixed(2)),
      totalInvestments: parseFloat(totalInvestments.toFixed(2)),
      upcomingExpenses: upcomingExpensesList
    };

    // Adicionar campos específicos para renda variável
    if (incomeType === 'VARIABLE') {
      dashboard.realIncomeThisMonth = realIncomeThisMonth ? parseFloat(realIncomeThisMonth.toFixed(2)) : 0;
      dashboard.averageMonthlyIncome = averageMonthlyIncome ? parseFloat(averageMonthlyIncome.toFixed(2)) : 0;
    }

    return dashboard;
  }
}
