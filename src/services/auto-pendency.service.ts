import { DatabaseService } from './database.service';
import { ExpenseService } from './expense.service';
import { NotificationService } from './notification.service';
import { v4 as uuidv4 } from 'uuid';

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
  isRecurring?: boolean;
  isGenerated?: boolean;
  parentExpenseId?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Serviço responsável por gerar automaticamente pendências quando o usuário acessa a plataforma
 */
export class AutoPendencyService {
  private db = DatabaseService.getInstance();
  private expenseService = new ExpenseService();
  private notificationService = new NotificationService();

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
   * Verifica e gera pendências automaticamente para um usuário específico
   * Este método é chamado quando o usuário acessa ou atualiza a plataforma
   */
  async checkAndGeneratePendencies(userId: string): Promise<{
    generated: number;
    removed: number;
    message: string;
  }> {
    console.log(`🔍 Verificando pendências para usuário ${userId}...`);
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let generatedCount = 0;
    let removedCount = 0;

    try {
      // 1. Buscar todas as despesas registradas (templates) do usuário
      const registeredExpenses = this.db.getExpenses().filter(e => 
        e.userId === userId && 
        e.isRecurring === true
      );

      console.log(`📋 Total de despesas registradas: ${registeredExpenses.length}`);

      // 2. Processar despesas fixas e recorrentes
      const fixedAndRecurrent = registeredExpenses.filter(e => 
        e.type === 'fixed' || e.type === 'recurrent'
      );

      for (const expense of fixedAndRecurrent) {
        const wasGenerated = await this.generateMonthlyExpense(expense, currentMonth);
        if (wasGenerated) generatedCount++;
      }

      // 3. Processar despesas parceladas
      const installmentExpenses = registeredExpenses.filter(e => 
        e.type === 'installment'
      );

      for (const expense of installmentExpenses) {
        const result = await this.processInstallmentExpense(expense, currentMonth);
        if (result.generated) generatedCount++;
        if (result.shouldRemoveTemplate) {
          // Remove a despesa template se todas as parcelas já foram geradas
          this.db.deleteExpense(expense.id);
          removedCount++;
          console.log(`🗑️ Despesa parcelada removida (todas parcelas geradas): ${expense.title}`);
        }
      }

      const message = this.buildResultMessage(generatedCount, removedCount);
      console.log(`✅ ${message}`);

      return {
        generated: generatedCount,
        removed: removedCount,
        message
      };

    } catch (error: any) {
      console.error('❌ Erro ao verificar pendências:', error);
      throw error;
    }
  }

  /**
   * Gera uma despesa mensal (fixa ou recorrente) se ainda não existir para o mês atual
   */
  private async generateMonthlyExpense(baseExpense: Expense, currentMonth: string): Promise<boolean> {
    try {
      // Verificar se já existe uma despesa gerada para este mês
      const existingExpense = this.db.getExpenses().find(e => 
        e.parentExpenseId === baseExpense.id && 
        e.referenceMonth === currentMonth
      );

      if (existingExpense) {
        console.log(`⏭️  Despesa já existe para ${baseExpense.title} no mês ${currentMonth}`);
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
        isRecurring: false,
        isGenerated: true,
        parentExpenseId: baseExpense.id,
        notes: baseExpense.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.db.addExpense(newExpense);
      console.log(`✅ Despesa gerada: ${newExpense.title} - Vencimento: ${newExpense.dueDate}`);

      // Criar notificação
      await this.createExpenseNotification(newExpense);

      return true;
    } catch (error: any) {
      console.error(`❌ Erro ao gerar despesa ${baseExpense.title}:`, error);
      return false;
    }
  }

  /**
   * Processa uma despesa parcelada
   * Retorna se gerou uma nova parcela e se deve remover o template
   */
  private async processInstallmentExpense(
    baseExpense: Expense, 
    currentMonth: string
  ): Promise<{ generated: boolean; shouldRemoveTemplate: boolean }> {
    try {
      const totalInstallments = baseExpense.totalInstallments || 1;

      // Buscar todas as parcelas já geradas
      const generatedInstallments = this.db.getExpenses().filter(e => 
        e.parentExpenseId === baseExpense.id && 
        e.type === 'installment' &&
        e.isGenerated === true
      );

      const nextInstallmentNumber = generatedInstallments.length + 1;

      console.log(`📊 ${baseExpense.title}: ${generatedInstallments.length}/${totalInstallments} parcelas geradas`);

      // Verificar se todas as parcelas já foram geradas
      if (nextInstallmentNumber > totalInstallments) {
        console.log(`✅ Todas as parcelas de ${baseExpense.title} já foram geradas`);
        
        // Verificar se a última parcela está na aba de pendentes
        const lastInstallment = generatedInstallments.find(e => 
          e.currentInstallment === totalInstallments
        );

        if (lastInstallment) {
          console.log(`🔍 Última parcela encontrada, deve remover template: ${lastInstallment.title}`);
          return { generated: false, shouldRemoveTemplate: true };
        }

        return { generated: false, shouldRemoveTemplate: false };
      }

      // Verificar se já existe uma parcela para o mês atual
      const existingInstallment = this.db.getExpenses().find(e => 
        e.parentExpenseId === baseExpense.id && 
        e.referenceMonth === currentMonth
      );

      if (existingInstallment) {
        console.log(`⏭️  Parcela já existe para ${baseExpense.title} no mês ${currentMonth}`);
        
        // Se é a última parcela, marcar para remover template
        if (nextInstallmentNumber > totalInstallments) {
          return { generated: false, shouldRemoveTemplate: true };
        }
        
        return { generated: false, shouldRemoveTemplate: false };
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
        type: 'installment',
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

      // Se foi a última parcela, marcar para remover template
      const shouldRemoveTemplate = nextInstallmentNumber === totalInstallments;

      return { generated: true, shouldRemoveTemplate };

    } catch (error: any) {
      console.error(`❌ Erro ao processar parcela de ${baseExpense.title}:`, error);
      return { generated: false, shouldRemoveTemplate: false };
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
   * Constrói mensagem de resultado
   */
  private buildResultMessage(generated: number, removed: number): string {
    const parts: string[] = [];
    
    if (generated > 0) {
      parts.push(`${generated} pendência${generated > 1 ? 's' : ''} gerada${generated > 1 ? 's' : ''}`);
    }
    
    if (removed > 0) {
      parts.push(`${removed} despesa${removed > 1 ? 's' : ''} parcelada${removed > 1 ? 's' : ''} finalizada${removed > 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
      return 'Nenhuma pendência pendente para gerar';
    }
    
    return parts.join(' e ');
  }
}
