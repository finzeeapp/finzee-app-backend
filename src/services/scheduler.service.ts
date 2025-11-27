import { DatabaseService } from './database.service';
import { ExpenseService } from './expense.service';
import { NotificationService } from './notification.service';
import { v4 as uuidv4 } from 'uuid';

// Importação condicional do node-cron para evitar erros
let cron: any;
try {
  cron = require('node-cron');
} catch (error) {
  console.warn('node-cron não encontrado, funcionalidade de agendamento desabilitada');
  cron = {
    schedule: () => ({ start: () => {}, stop: () => {} })
  };
}

// Interfaces locais
interface Expense {
  id: string;
  userId: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  type: string;
  dueDate: Date | string;
  dueDay?: number;
  status: string;
  isPaid: boolean;
  paymentDate?: Date | string;
  receiptUrl?: string;
  installments?: number;
  currentInstallment?: number;
  totalInstallments?: number;
  referenceMonth?: string;
  isRecurring?: boolean; // Marca se é uma despesa recorrente (base)
  isGenerated?: boolean; // Marca se foi gerada automaticamente
  parentExpenseId?: string; // ID da despesa base para despesas geradas
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class SchedulerService {
  private db = DatabaseService.getInstance();
  private expenseService = new ExpenseService();
  private notificationService = new NotificationService();
  private cronJob: any | null = null;

  constructor() {
    this.startScheduler();
  }

  /**
   * Formata uma data no formato YYYY-MM-DD sem problemas de timezone
   */
  private formatDateLocal(year: number, month: number, day: number): string {
    const yearStr = year.toString();
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  }

  /**
   * Inicia o scheduler para rodar no primeiro dia de cada mês às 00:01
   */
  startScheduler(): void {
    console.log('🕐 Iniciando scheduler de pendências mensais...');
    
    // Executa no primeiro dia de cada mês às 00:01
    this.cronJob = cron.schedule('1 0 1 * *', async () => {
      console.log('🗓️ Executando criação automática de pendências mensais...');
      await this.generateMonthlyExpenses();
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    this.cronJob.start();

    console.log('✅ Scheduler iniciado com sucesso!');
  }

  /**
   * Para o scheduler
   */
  stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Scheduler parado.');
    }
  }

  /**
   * Executa manualmente a geração de pendências mensais
   */
  async executeManually(): Promise<{ success: boolean; message: string; generated: number }> {
    try {
      const generated = await this.generateMonthlyExpenses();
      return {
        success: true,
        message: `Pendências geradas com sucesso para o mês atual.`,
        generated
      };
    } catch (error: any) {
      console.error('❌ Erro ao executar scheduler manualmente:', error);
      return {
        success: false,
        message: `Erro ao gerar pendências: ${error.message}`,
        generated: 0
      };
    }
  }

  /**
   * Gera as despesas mensais baseadas nas despesas recorrentes e parceladas
   */
  private async generateMonthlyExpenses(): Promise<number> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`📅 Gerando pendências para o mês: ${currentMonth}`);

    let generatedCount = 0;
    const allUsers = this.db.getUsers();

    for (const user of allUsers) {
      const userGeneratedCount = await this.generateUserMonthlyExpenses(user.id, currentMonth);
      generatedCount += userGeneratedCount;
    }

    console.log(`✅ Total de ${generatedCount} pendências geradas para todos os usuários.`);
    return generatedCount;
  }

  /**
   * Gera as despesas mensais para um usuário específico
   */
  private async generateUserMonthlyExpenses(userId: string, currentMonth: string): Promise<number> {
    const allExpenses = this.db.getExpenses().filter(e => e.userId === userId);
    let generatedCount = 0;

    // 1. Processar despesas recorrentes
    const fixedExpenses = allExpenses.filter(e => 
      e.type === 'recurrent' && 
      e.isRecurring === true
    );

    for (const expense of fixedExpenses) {
      const generated = await this.generateRecurringExpense(expense, currentMonth);
      if (generated) generatedCount++;
    }

    // 2. Processar despesas parceladas e financiamentos
    const installmentExpenses = allExpenses.filter(e => 
      (e.type === 'installment' || e.type === 'financing') && 
      e.isRecurring === true
    );

    for (const expense of installmentExpenses) {
      const generated = await this.generateInstallmentExpense(expense, currentMonth);
      if (generated) generatedCount++;
    }

    if (generatedCount > 0) {
      console.log(`👤 Usuário ${userId}: ${generatedCount} pendências geradas`);
    }

    return generatedCount;
  }

  /**
   * Gera uma despesa recorrente para o mês atual
   */
  private async generateRecurringExpense(baseExpense: Expense, currentMonth: string): Promise<boolean> {
    try {
      // Verificar se já existe uma despesa gerada para este mês
      const existingExpense = this.db.getExpenses().find(e => 
        e.parentExpenseId === baseExpense.id && 
        e.referenceMonth === currentMonth
      );

      if (existingExpense) {
        console.log(`⏭️ Despesa recorrente já existe para ${baseExpense.title} no mês ${currentMonth}`);
        return false;
      }

      // Calcular data de vencimento
      const [year, month] = currentMonth.split('-').map(Number);
      const dueDay = baseExpense.dueDay || 1;
      
      // Ajustar dia se for maior que o último dia do mês
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const adjustedDueDay = Math.min(dueDay, lastDayOfMonth);
      
      // Formatar data sem problema de timezone
      const dueDate = this.formatDateLocal(year, month, adjustedDueDay);

      // Criar nova despesa para o mês atual
      const newExpense: Expense = {
        id: uuidv4(),
        userId: baseExpense.userId,
        title: baseExpense.title,
        description: baseExpense.description,
        amount: baseExpense.amount,
        category: baseExpense.category,
        type: baseExpense.type,
        dueDate: dueDate,
        dueDay: adjustedDueDay,
        status: 'PENDING',
        isPaid: false,
        referenceMonth: currentMonth,
        isRecurring: false, // Esta é uma instância gerada, não a base
        isGenerated: true,
        parentExpenseId: baseExpense.id,
        notes: baseExpense.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.db.addExpense(newExpense);
      console.log(`✅ Despesa recorrente gerada: ${newExpense.title} - Vencimento: ${newExpense.dueDate}`);

      // Criar notificação
      await this.createExpenseNotification(newExpense);

      return true;
    } catch (error: any) {
      console.error(`❌ Erro ao gerar despesa recorrente ${baseExpense.title}:`, error);
      return false;
    }
  }

  /**
   * Gera uma parcela de despesa parcelada para o mês atual
   */
  private async generateInstallmentExpense(baseExpense: Expense, currentMonth: string): Promise<boolean> {
    try {
      // Verificar se já existe uma parcela gerada para este mês
      const existingExpense = this.db.getExpenses().find(e => 
        e.parentExpenseId === baseExpense.id && 
        e.referenceMonth === currentMonth
      );

      if (existingExpense) {
        console.log(`⏭️ Parcela já existe para ${baseExpense.title} no mês ${currentMonth}`);
        return false;
      }

      // Calcular qual parcela deve ser gerada
      const allInstallments = this.db.getExpenses().filter(e => 
        e.parentExpenseId === baseExpense.id && 
        (e.type === 'installment' || e.type === 'financing') &&
        e.isGenerated === true
      );

      const nextInstallmentNumber = allInstallments.length + 1;
      const totalInstallments = baseExpense.totalInstallments || 1;

      // Verificar se ainda há parcelas a serem geradas
      if (nextInstallmentNumber > totalInstallments) {
        console.log(`✅ Todas as parcelas de ${baseExpense.title} já foram geradas`);
        return false;
      }

      // Calcular data de vencimento
      const [year, month] = currentMonth.split('-').map(Number);
      const dueDay = baseExpense.dueDay || 1;
      
      // Ajustar dia se for maior que o último dia do mês
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const adjustedDueDay = Math.min(dueDay, lastDayOfMonth);
      
      // Formatar data sem problema de timezone
      const dueDate = this.formatDateLocal(year, month, adjustedDueDay);

      // Calcular valor da parcela
      const installmentAmount = baseExpense.amount / totalInstallments;

      // Criar nova parcela para o mês atual
      const newExpense: Expense = {
        id: uuidv4(),
        userId: baseExpense.userId,
        title: `${baseExpense.title} (${nextInstallmentNumber}/${totalInstallments})`,
        description: baseExpense.description,
        amount: Number(installmentAmount.toFixed(2)),
        category: baseExpense.category,
        type: baseExpense.type, // Manter o tipo original (installment ou financing)
        dueDate: dueDate,
        dueDay: adjustedDueDay,
        status: 'PENDING',
        isPaid: false,
        installments: nextInstallmentNumber,
        currentInstallment: nextInstallmentNumber,
        totalInstallments: totalInstallments,
        referenceMonth: currentMonth,
        isRecurring: false,
        isGenerated: true,
        parentExpenseId: baseExpense.id,
        notes: baseExpense.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.db.addExpense(newExpense);
      console.log(`✅ Parcela gerada: ${newExpense.title} - Valor: R$ ${newExpense.amount} - Vencimento: ${newExpense.dueDate}`);

      // Criar notificação
      await this.createExpenseNotification(newExpense);

      return true;
    } catch (error: any) {
      console.error(`❌ Erro ao gerar parcela de ${baseExpense.title}:`, error);
      return false;
    }
  }

  /**
   * Cria notificação para uma nova despesa gerada
   */
  private async createExpenseNotification(expense: Expense): Promise<void> {
    try {
      const notification = {
        userId: expense.userId,
        title: 'Nova Pendência Gerada',
        message: `A despesa "${expense.title}" foi adicionada às suas pendências do mês com vencimento em ${new Date(expense.dueDate).toLocaleDateString('pt-BR')}.`,
        type: 'expense_generated',
        relatedEntityId: expense.id
      };

      await this.notificationService.create(notification);
    } catch (error: any) {
      console.error('❌ Erro ao criar notificação:', error);
    }
  }

  /**
   * Retorna estatísticas do scheduler
   */
  getSchedulerStatus(): {
    isRunning: boolean;
    nextExecution: string | null;
    lastExecution: string | null;
  } {
    const isRunning = this.cronJob !== null;
    
    return {
      isRunning,
      nextExecution: isRunning ? 'Próximo dia 1º do mês às 00:01' : null,
      lastExecution: null // Por enquanto não armazenamos histórico
    };
  }

  /**
   * Remove despesas geradas de um mês específico (para testes/debug)
   */
  async clearGeneratedExpensesForMonth(month: string, userId?: string): Promise<number> {
    const allExpenses = this.db.getExpenses();
    let removedCount = 0;

    const expensesToRemove = allExpenses.filter(e => 
      e.referenceMonth === month &&
      e.isGenerated === true &&
      (!userId || e.userId === userId)
    );

    for (const expense of expensesToRemove) {
      this.db.deleteExpense(expense.id);
      removedCount++;
    }

    console.log(`🗑️ Removidas ${removedCount} despesas geradas do mês ${month}`);
    return removedCount;
  }
}
