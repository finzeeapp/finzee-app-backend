import { prisma } from './prisma.service';

export interface CreateIncomeDTO {
  description: string;
  amount: number;
  category?: string;
  date: Date;
  notes?: string;
}

export interface UpdateIncomeDTO {
  description?: string;
  amount?: number;
  category?: string;
  date?: Date;
  notes?: string;
}

export interface IncomeStats {
  totalThisMonth: number;
  averageMonthly: number;
  totalByCategory: { category: string; total: number }[];
  recentIncomes: any[];
}

export class IncomeService {
  /**
   * Criar novo lançamento de renda
   */
  async create(userId: string, data: CreateIncomeDTO) {
    return prisma.income.create({
      data: {
        userId,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date,
        notes: data.notes
      }
    });
  }

  /**
   * Listar rendas de um usuário com filtros
   */
  async list(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      category?: string;
      limit?: number;
    }
  ) {
    const where: any = { userId };

    if (options?.startDate || options?.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = options.startDate;
      if (options.endDate) where.date.lte = options.endDate;
    }

    if (options?.category) {
      where.category = options.category;
    }

    return prisma.income.findMany({
      where,
      orderBy: { date: 'desc' },
      take: options?.limit || 100
    });
  }

  /**
   * Buscar renda por ID
   */
  async getById(incomeId: string, userId: string) {
    return prisma.income.findFirst({
      where: {
        id: incomeId,
        userId
      }
    });
  }

  /**
   * Atualizar renda
   */
  async update(incomeId: string, userId: string, data: UpdateIncomeDTO) {
    return prisma.income.updateMany({
      where: {
        id: incomeId,
        userId
      },
      data
    });
  }

  /**
   * Deletar renda
   */
  async delete(incomeId: string, userId: string) {
    return prisma.income.deleteMany({
      where: {
        id: incomeId,
        userId
      }
    });
  }

  /**
   * Calcular estatísticas de renda
   */
  async getStats(userId: string, year?: number, month?: number): Promise<IncomeStats> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    // Total do mês atual
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const incomesThisMonth = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const totalThisMonth = incomesThisMonth.reduce((sum, inc) => sum + inc.amount, 0);

    // Calcular média mensal (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allIncomes = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: sixMonthsAgo
        }
      },
      orderBy: { date: 'desc' }
    });

    // Agrupar por mês
    const incomesByMonth = new Map<string, number>();
    allIncomes.forEach(income => {
      const monthKey = `${income.date.getFullYear()}-${income.date.getMonth() + 1}`;
      incomesByMonth.set(monthKey, (incomesByMonth.get(monthKey) || 0) + income.amount);
    });

    const averageMonthly = incomesByMonth.size > 0
      ? Array.from(incomesByMonth.values()).reduce((a, b) => a + b, 0) / incomesByMonth.size
      : 0;

    // Total por categoria (mês atual)
    const categoryMap = new Map<string, number>();
    incomesThisMonth.forEach(income => {
      const cat = income.category || 'Outros';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + income.amount);
    });

    const totalByCategory = Array.from(categoryMap.entries()).map(([category, total]) => ({
      category,
      total
    }));

    // Rendas recentes (últimas 10)
    const recentIncomes = await prisma.income.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10
    });

    return {
      totalThisMonth,
      averageMonthly,
      totalByCategory,
      recentIncomes
    };
  }

  /**
   * Calcular renda real acumulada no mês
   */
  async getRealIncomeThisMonth(userId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const incomes = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    return incomes.reduce((sum, income) => sum + income.amount, 0);
  }
}
