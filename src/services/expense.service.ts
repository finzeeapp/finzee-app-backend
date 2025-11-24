import { DatabaseService } from './database.service';
import { v4 as uuidv4 } from 'uuid';

// Importar types localmente
enum ExpenseStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

interface Expense {
  id: string;
  userId: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  type: string;
  dueDate: string;
  dueDay?: number;
  status: ExpenseStatus;
  isPaid: boolean;
  receiptUrl?: string;
  installments?: {
    current: number;
    total: number;
  };
  totalInstallments?: number;
  referenceMonth?: string;
  isRecurring?: boolean;
  isGenerated?: boolean;
  parentExpenseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ExpenseService {
  private db = DatabaseService.getInstance();

  /**
   * Retorna a data atual no formato YYYY-MM-DD sem problema de timezone
   */
  private getTodayLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-based
    const day = now.getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  async create(data: any): Promise<any> {
    const expense: any = {
      id: uuidv4(),
      userId: data.userId,
      title: data.title,
      description: data.description,
      amount: data.amount,
      category: data.category,
      type: data.type,
      dueDate: data.dueDate,
      dueDay: data.dueDay || data.recurrenceDay,
      status: ExpenseStatus.PENDING,
      isPaid: false,
      paid: false, // Compatibilidade com frontend
      totalInstallments: data.totalInstallments,
      referenceMonth: data.referenceMonth,
      isRecurring: data.isRecurring || false,
      isGenerated: data.isGenerated || false,
      parentExpenseId: data.parentExpenseId,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.db.addExpense(expense);
    return expense;
  }

  async findAll(userId: string): Promise<any[]> {
    return this.db.getExpenses().filter(e => e.userId === userId);
  }

  async findById(id: string, userId: string): Promise<any | null> {
    const expense = this.db.getExpenses().find(e => e.id === id && e.userId === userId);
    return expense || null;
  }

  async update(id: string, userId: string, data: any): Promise<any> {
    const expenses = this.db.getExpenses();
    const index = expenses.findIndex(e => e.id === id && e.userId === userId);

    if (index === -1) {
      throw new Error('Despesa não encontrada');
    }

    const expense = expenses[index];
    const updated = {
      ...expense,
      ...data,
      updatedAt: new Date()
    };

    expenses[index] = updated;
    this.db.saveExpenses(expenses);

    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const expenses = this.db.getExpenses();
    const filtered = expenses.filter(e => !(e.id === id && e.userId === userId));

    if (filtered.length === expenses.length) {
      throw new Error('Despesa não encontrada');
    }

    this.db.saveExpenses(filtered);
  }

  async markAsPaid(id: string, userId: string, paymentInfo?: {
    paymentMethod?: string;
    paidAt?: string;
  }): Promise<any> {
    const updateData: any = {
      isPaid: true,
      paid: true,
      status: ExpenseStatus.PAID,
      paidAt: paymentInfo?.paidAt || new Date().toISOString()
    };

    if (paymentInfo && paymentInfo.paymentMethod) {
      updateData.paymentMethod = paymentInfo.paymentMethod;
    }

    return this.update(id, userId, updateData);
  }

  /**
   * Busca despesas do mês atual para um usuário
   */
  async findCurrentMonthExpenses(userId: string): Promise<any[]> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`🔍 Buscando despesas do mês ${currentMonth} para usuário ${userId}`);
    
    const allExpenses = this.db.getExpenses();
    console.log(`📊 Total de despesas no banco: ${allExpenses.length}`);
    
    const filtered = allExpenses.filter(e => {
      // Não incluir despesas base (templates)
      if (e.isRecurring === true) {
        console.log(`  ⏭️  Ignorando template: ${e.title}`);
        return false;
      }
      
      // Não pertence ao usuário
      if (e.userId !== userId) {
        return false;
      }
      
      // Se tem referenceMonth, usar ele
      if (e.referenceMonth) {
        const match = e.referenceMonth === currentMonth;
        console.log(`  ${match ? '✅' : '❌'} ${e.title} - referenceMonth: ${e.referenceMonth} (${match ? 'INCLUIR' : 'IGNORAR'})`);
        return match;
      }
      
      // Se não tem referenceMonth, verificar se dueDate é do mês atual
      if (e.dueDate) {
        const dueMonth = e.dueDate.toString().substring(0, 7); // YYYY-MM
        const match = dueMonth === currentMonth;
        console.log(`  ${match ? '✅' : '❌'} ${e.title} - dueDate: ${e.dueDate} (mês: ${dueMonth}) (${match ? 'INCLUIR' : 'IGNORAR'})`);
        return match;
      }
      
      // Se não tem nem referenceMonth nem dueDate, incluir por padrão
      console.log(`  ⚠️  ${e.title} - Sem data, incluindo por padrão`);
      return true;
    });
    
    console.log(`✅ Despesas filtradas do mês atual: ${filtered.length}`);
    return filtered;
  }

  /**
   * Busca despesas recorrentes base de um usuário
   */
  async findRecurringExpenses(userId: string): Promise<any[]> {
    return this.db.getExpenses().filter(e => 
      e.userId === userId && 
      e.isRecurring === true
    );
  }

  /**
   * Cria uma despesa recorrente base
   */
  async createRecurringExpense(data: any): Promise<any> {
    const expense = {
      id: uuidv4(),
      userId: data.userId,
      title: data.title,
      description: data.description,
      amount: data.amount,
      category: data.category,
      type: data.type,
      dueDate: data.dueDate || this.getTodayLocal(), // Campo obrigatório
      dueDay: data.dueDay || data.recurrenceDay,
      status: 'TEMPLATE', // Status especial para despesas base
      isPaid: false,
      totalInstallments: data.totalInstallments,
      isRecurring: true,
      isGenerated: false,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.db.addExpense(expense);
    return expense;
  }
}
