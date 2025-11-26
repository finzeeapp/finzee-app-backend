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
    
    // Calcular referenceMonth baseado na dueDate se não for fornecido
    let referenceMonth = data.referenceMonth;
    if (!referenceMonth && !data.isRecurring) {
      const year = dueDate.getFullYear();
      const month = dueDate.getMonth() + 1;
      referenceMonth = `${year}-${month.toString().padStart(2, '0')}`;
    }

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
        status: data.isRecurring ? 'TEMPLATE' : 'PENDING',
        isPaid: false,
        totalInstallments: data.totalInstallments,
        currentInstallment: data.currentInstallment,
        referenceMonth: referenceMonth,
        isRecurring: data.isRecurring || false,
        isGenerated: data.isGenerated || false,
        parentExpenseId: data.parentExpenseId,
        notes: data.notes
      }
    });

    return expense;
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
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
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
}
