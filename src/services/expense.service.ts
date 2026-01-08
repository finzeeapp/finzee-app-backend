import { prisma } from './prisma.service';

export class ExpenseService {
  /**
   * Retorna o mês atual no formato YYYY-MM
   */
  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  async create(data: any): Promise<any> {
    const dueDate = new Date(data.dueDate);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Determinar se é uma despesa recorrente/registrada
    const isRecurring = data.isRecurring || data.type === 'recurrent' || data.type === 'financing' || 
                       (data.type === 'installment' && data.totalInstallments > 1) || 
                       (data.type === 'financing' && data.totalInstallments > 1);
    
    // Calcular referenceMonth baseado na dueDate se não for fornecido
    let referenceMonth = data.referenceMonth;
    if (!referenceMonth && !isRecurring) {
      const year = dueDate.getFullYear();
      const month = dueDate.getMonth() + 1;
      referenceMonth = `${year}-${month.toString().padStart(2, '0')}`;
    }

    // Criar a despesa (template se for recorrente)
    const expense = await prisma.expense.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        category: data.category,
        type: data.type,
        dueDate: dueDate,
        dueDay: data.dueDay || data.recurrenceDay || dueDate.getDate(),
        status: isRecurring ? 'TEMPLATE' : 'PENDING',
        isPaid: false,
        totalInstallments: data.totalInstallments,
        currentInstallment: data.currentInstallment,
        referenceMonth: referenceMonth,
        isRecurring: isRecurring,
        isGenerated: data.isGenerated || false,
        parentExpenseId: data.parentExpenseId,
        notes: data.notes
      }
    });

    // Se for recorrente, gerar automaticamente a instância para o mês atual
    if (isRecurring && !data.isGenerated) {
      await this.generateInstanceForMonth(expense, currentMonth);
    }

    return expense;
  }

  /**
   * Gera uma instância de despesa para um mês específico
   */
  private async generateInstanceForMonth(baseExpense: any, targetMonth: string): Promise<any | null> {
    try {
      // Verificar se já existe uma instância para este mês
      const existing = await prisma.expense.findFirst({
        where: {
          parentExpenseId: baseExpense.id,
          referenceMonth: targetMonth
        }
      });

      if (existing) {
        console.log(`⏭️  Instância já existe para ${baseExpense.title} no mês ${targetMonth}`);
        return null;
      }

      // Para parceladas e financiamentos, verificar se deve gerar baseado na data de início
      if ((baseExpense.type === 'installment' || baseExpense.type === 'financing') && baseExpense.totalInstallments) {
        const startDate = new Date(baseExpense.dueDate);
        const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Se o mês atual é anterior ao mês de início, não gera
        if (targetMonth < startMonth) {
          console.log(`⏭️  Ainda não é o mês de iniciar ${baseExpense.title}`);
          return null;
        }
      }

      // Calcular data de vencimento
      const [year, month] = targetMonth.split('-').map(Number);
      const dueDay = baseExpense.dueDay || 1;
      
      // Ajustar dia se for maior que o último dia do mês
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const adjustedDueDay = Math.min(dueDay, lastDayOfMonth);
      
      const dueDate = new Date(year, month - 1, adjustedDueDay);

      // Para parceladas e financiamentos, calcular número da parcela e valor
      let title = baseExpense.title;
      let amount = baseExpense.amount;
      let currentInstallment = undefined;
      
      if ((baseExpense.type === 'installment' || baseExpense.type === 'financing') && baseExpense.totalInstallments) {
        // Calcular o número da parcela baseado na diferença de meses entre início e mês atual
        const startDate = new Date(baseExpense.dueDate);
        const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
        const startYear = startDate.getFullYear();
        const startMonthNum = startDate.getMonth() + 1;
        
        const monthsDiff = (targetYear - startYear) * 12 + (targetMonthNum - startMonthNum);
        currentInstallment = monthsDiff + 1;
        
        // Se já passou de todas as parcelas, não gera mais
        if (currentInstallment > baseExpense.totalInstallments) {
          console.log(`✅ Todas as parcelas de ${baseExpense.title} já foram geradas`);
          return null;
        }
        
        // Verificar se já existe essa parcela específica
        const existingInstallment = await prisma.expense.findFirst({
          where: {
            parentExpenseId: baseExpense.id,
            currentInstallment: currentInstallment
          }
        });
        
        if (existingInstallment) {
          console.log(`⏭️  Parcela ${currentInstallment} já existe para ${baseExpense.title}`);
          return null;
        }
        
        amount = baseExpense.amount / baseExpense.totalInstallments;
        title = `${baseExpense.title} (${currentInstallment}/${baseExpense.totalInstallments})`;
      }

      // Criar instância para o mês
      const instance = await prisma.expense.create({
        data: {
          userId: baseExpense.userId,
          title,
          description: baseExpense.description,
          amount: Number(amount.toFixed(2)),
          category: baseExpense.category,
          type: baseExpense.type,
          dueDate,
          dueDay: adjustedDueDay,
          status: 'PENDING',
          isPaid: false,
          referenceMonth: targetMonth,
          isRecurring: false,
          isGenerated: true,
          parentExpenseId: baseExpense.id,
          currentInstallment,
          totalInstallments: baseExpense.totalInstallments,
          notes: baseExpense.notes
        }
      });

      console.log(`✅ Instância gerada: ${instance.title} - Vencimento: ${instance.dueDate}`);
      return instance;
      
    } catch (error: any) {
      console.error(`❌ Erro ao gerar instância de ${baseExpense.title}:`, error);
      return null;
    }
  }

  async findAll(userId: string): Promise<any[]> {
    return prisma.expense.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' }
    });
  }

  async findById(id: string, userId: string): Promise<any | null> {
    return prisma.expense.findFirst({
      where: { id, userId }
    });
  }

  async update(id: string, userId: string, data: any): Promise<any> {
    // Verificar se existe
    const existing = await prisma.expense.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new Error('Despesa não encontrada');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.type !== undefined) updateData.type = data.type;
    
    // Se dueDate foi alterada, atualizar também dueDay e referenceMonth (para despesas não recorrentes)
    if (data.dueDate !== undefined) {
      const newDueDate = new Date(data.dueDate);
      updateData.dueDate = newDueDate;
      updateData.dueDay = newDueDate.getDate();
      
      // Atualizar referenceMonth apenas se não for despesa recorrente/registrada
      if (!existing.isRecurring) {
        const year = newDueDate.getFullYear();
        const month = newDueDate.getMonth() + 1;
        updateData.referenceMonth = `${year}-${month.toString().padStart(2, '0')}`;
      }
    }
    
    if (data.dueDay !== undefined) updateData.dueDay = data.dueDay;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;
    if (data.paymentDate !== undefined) updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.expense.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verificar se existe
    const existing = await prisma.expense.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new Error('Despesa não encontrada');
    }

    await prisma.expense.delete({
      where: { id }
    });
  }

  async markAsPaid(id: string, userId: string, paymentInfo?: {
    paymentMethod?: string;
    paidAt?: string;
  }): Promise<any> {
    const updateData: any = {
      isPaid: true,
      status: 'PAID',
      paymentDate: paymentInfo?.paidAt ? new Date(paymentInfo.paidAt) : new Date()
    };

    return this.update(id, userId, updateData);
  }

  /**
   * Busca despesas do mês atual para um usuário
   */
  async findCurrentMonthExpenses(userId: string): Promise<any[]> {
    const currentMonth = this.getCurrentMonth();
    
    console.log(`🔍 Buscando despesas do mês ${currentMonth} para usuário ${userId}`);
    
    // Buscar despesas com referenceMonth ou dueDate no mês atual, excluindo templates
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        isRecurring: false, // Não incluir templates
        OR: [
          { referenceMonth: currentMonth },
          {
            AND: [
              { referenceMonth: null },
              { 
                dueDate: {
                  gte: new Date(`${currentMonth}-01`),
                  lt: new Date(`${currentMonth}-31`)
                }
              }
            ]
          }
        ]
      },
      orderBy: { dueDate: 'asc' }
    });
    
    console.log(`✅ Despesas filtradas do mês atual: ${expenses.length}`);
    return expenses;
  }

  /**
   * Busca despesas recorrentes base de um usuário
   */
  async findRecurringExpenses(userId: string): Promise<any[]> {
    return prisma.expense.findMany({
      where: {
        userId,
        isRecurring: true
      },
      orderBy: { dueDay: 'asc' }
    });
  }

  /**
   * Cria uma despesa recorrente base
   */
  async createRecurringExpense(data: any): Promise<any> {
    return prisma.expense.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        category: data.category,
        type: data.type,
        dueDate: new Date(data.dueDate || new Date()),
        dueDay: data.dueDay || data.recurrenceDay,
        status: 'TEMPLATE',
        isPaid: false,
        totalInstallments: data.totalInstallments,
        isRecurring: true,
        isGenerated: false,
        notes: data.notes
      }
    });
  }

  /**
   * Busca despesas por aba/filtro
   */
  async findByTab(userId: string, tab: 'pending' | 'paid' | 'registered' | 'recurrent' | 'installment'): Promise<any[]> {
    const currentMonth = this.getCurrentMonth();

    switch (tab) {
      case 'pending':
        // Despesas do mês atual não pagas
        return prisma.expense.findMany({
          where: {
            userId,
            referenceMonth: currentMonth,
            isPaid: false,
            isRecurring: false
          },
          orderBy: { dueDate: 'asc' }
        });

      case 'paid':
        // Despesas do mês atual já pagas
        return prisma.expense.findMany({
          where: {
            userId,
            referenceMonth: currentMonth,
            isPaid: true,
            isRecurring: false
          },
          orderBy: { paymentDate: 'desc' }
        });

      case 'registered':
        // Todas as despesas registradas (templates)
        return prisma.expense.findMany({
          where: {
            userId,
            isRecurring: true
          },
          orderBy: { dueDay: 'asc' }
        });

      case 'recurrent':
        // Apenas despesas recorrentes
        return prisma.expense.findMany({
          where: {
            userId,
            isRecurring: true,
            type: 'recurrent'
          },
          orderBy: { dueDay: 'asc' }
        });

      case 'installment':
        // Apenas despesas parceladas (templates)
        return prisma.expense.findMany({
          where: {
            userId,
            isRecurring: true,
            type: { in: ['installment', 'financing'] }
          },
          orderBy: { createdAt: 'desc' }
        });

      default:
        return [];
    }
  }
}
