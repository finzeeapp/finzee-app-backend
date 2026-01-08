import { prisma } from './prisma.service';
import { IncomeService } from './income.service';

interface Dashboard {
  // Renda
  incomeType: string; // FIXED ou VARIABLE
  monthlyIncome: number; // Renda fixa ou renda estimada
  realIncomeThisMonth?: number; // Renda real acumulada (apenas para VARIABLE)
  averageMonthlyIncome?: number; // Média mensal (apenas para VARIABLE)
  estimatedMonthlyIncome?: number; // Meta mensal para VARIABLE
  
  currentMonthBalance: number; // Saldo apenas do mês atual (sem acumulado)
  accumulatedBalance: number; // Saldo acumulado dos meses anteriores
  availableBalance: number; // Total disponível (currentMonthBalance + accumulatedBalance)
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
        estimatedMonthlyIncome: true,
        accumulatedBalance: true,
        lastBalanceUpdate: true
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

    // Buscar renda real do mês para todos os usuários (FIXED e VARIABLE)
    realIncomeThisMonth = await this.incomeService.getRealIncomeThisMonth(userId);

    if (incomeType === 'FIXED') {
      // Renda fixa: usar monthlyIncome cadastrado + entradas extras do mês
      const baseIncome = Number(user?.monthlyIncome) || 0;
      monthlyIncome = baseIncome + (realIncomeThisMonth || 0);
    } else {
      // Renda variável: usar estimativa + calcular renda real
      monthlyIncome = Number(user?.estimatedMonthlyIncome) || 0;
      
      const stats = await this.incomeService.getStats(userId);
      averageMonthlyIncome = stats.averageMonthly;
    }

    const availableBalance = (incomeType === 'FIXED' ? monthlyIncome : (realIncomeThisMonth || monthlyIncome)) - totalExpenses;

    // Verificar se precisamos atualizar o saldo acumulado do mês anterior
    const lastUpdate = user?.lastBalanceUpdate;
    let accumulatedBalance = Number(user?.accumulatedBalance || 0);

    if (lastUpdate && lastUpdate !== referenceMonth) {
      // O mês mudou! Precisamos calcular o saldo do mês anterior e acumulá-lo
      const [lastYear, lastMonth] = lastUpdate.split('-').map(Number);
      
      // Buscar despesas do mês anterior
      const previousExpenses = await prisma.expense.findMany({
        where: {
          userId,
          referenceMonth: lastUpdate,
          isRecurring: false
        }
      });

      const previousTotalExpenses = previousExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Buscar renda do mês anterior
      let previousMonthIncome = 0;
      const previousRealIncome = await this.incomeService.getRealIncomeForMonth(userId, lastYear, lastMonth);
      
      if (incomeType === 'FIXED') {
        const baseIncome = Number(user?.monthlyIncome) || 0;
        previousMonthIncome = baseIncome + (previousRealIncome || 0);
      } else {
        previousMonthIncome = previousRealIncome || 0;
      }

      // Calcular o saldo do mês anterior e acumular
      const previousMonthBalance = previousMonthIncome - previousTotalExpenses;
      accumulatedBalance += previousMonthBalance;

      // Atualizar o saldo acumulado no banco de dados
      await prisma.user.update({
        where: { id: userId },
        data: {
          accumulatedBalance,
          lastBalanceUpdate: referenceMonth
        }
      });
    } else if (!lastUpdate) {
      // Primeira vez que o usuário acessa - inicializar
      await prisma.user.update({
        where: { id: userId },
        data: {
          accumulatedBalance: 0,
          lastBalanceUpdate: referenceMonth
        }
      });
    }

    // Calcular o saldo disponível incluindo o saldo acumulado
    const finalAvailableBalance = availableBalance + accumulatedBalance;

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
      currentMonthBalance: parseFloat(availableBalance.toFixed(2)),
      accumulatedBalance: parseFloat(accumulatedBalance.toFixed(2)),
      availableBalance: parseFloat(finalAvailableBalance.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      pendingExpenses: parseFloat(pendingExpenses.toFixed(2)),
      totalInvestments: parseFloat(totalInvestments.toFixed(2)),
      upcomingExpenses: upcomingExpensesList
    };

    // Adicionar campos específicos para renda variável
    if (incomeType === 'VARIABLE') {
      dashboard.realIncomeThisMonth = realIncomeThisMonth ? parseFloat(realIncomeThisMonth.toFixed(2)) : 0;
      dashboard.averageMonthlyIncome = averageMonthlyIncome ? parseFloat(averageMonthlyIncome.toFixed(2)) : 0;
      dashboard.estimatedMonthlyIncome = Number(user?.estimatedMonthlyIncome) || 0;
    } else {
      // Para renda fixa, também incluir realIncomeThisMonth para debug/transparência
      dashboard.realIncomeThisMonth = realIncomeThisMonth ? parseFloat(realIncomeThisMonth.toFixed(2)) : 0;
    }

    return dashboard;
  }

  async updateAccumulatedBalance(userId: string, accumulatedBalance: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { accumulatedBalance }
    });
  }
}
