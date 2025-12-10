import { prisma } from './prisma.service';
import { NotificationService } from './notification.service';

/**
 * Serviço responsável por gerar automaticamente pendências quando o usuário acessa a plataforma
 */
export class AutoPendencyService {
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
    message: string;
  }> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let generatedCount = 0;

    try {
      // 1. Buscar todas as despesas registradas (templates) do usuário
      const registeredExpenses = await prisma.expense.findMany({
        where: {
          userId,
          isRecurring: true
        }
      });

      // 2. Processar cada despesa registrada (sem logs individuais)
      for (const expense of registeredExpenses) {
        const wasGenerated = await this.generateMonthlyExpense(expense, currentMonth);
        if (wasGenerated) generatedCount++;
      }

      const message = this.buildResultMessage(generatedCount);
      
      // Log apenas se gerou algo
      if (generatedCount > 0) {
        console.log(`✅ ${message} para usuário ${userId}`);
      }

      return {
        generated: generatedCount,
        message
      };

    } catch (error: any) {
      console.error('❌ Erro ao verificar pendências:', error);
      throw error;
    }
  }

  /**
   * Gera uma despesa mensal (fixa, recorrente ou parcelada) se ainda não existir para o mês atual
   */
  private async generateMonthlyExpense(baseExpense: any, currentMonth: string): Promise<boolean> {
    try {
      // Verificar se já existe uma despesa gerada para este mês
      const existingExpense = await prisma.expense.findFirst({
        where: {
          parentExpenseId: baseExpense.id,
          referenceMonth: currentMonth
        }
      });

      if (existingExpense) {
        // Não loga se já existe (silencioso)
        return false;
      }

      // Para parceladas e financiamentos, verificar se deve gerar baseado na data de início
      if ((baseExpense.type === 'installment' || baseExpense.type === 'financing') && baseExpense.totalInstallments) {
        // Buscar quantas parcelas já foram geradas
        const generatedCount = await prisma.expense.count({
          where: {
            parentExpenseId: baseExpense.id,
            isGenerated: true
          }
        });

        // Se já gerou todas as parcelas, não gera mais
        if (generatedCount >= baseExpense.totalInstallments) {
          return false;
        }

        // Verificar se a primeira parcela deve ser no mês atual
        const startDate = new Date(baseExpense.dueDate);
        const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Calcular qual mês deveria ter essa parcela
        const [startYear, startMonthNum] = startMonth.split('-').map(Number);
        const [currentYear, currentMonthNum] = currentMonth.split('-').map(Number);
        
        const monthsDiff = (currentYear - startYear) * 12 + (currentMonthNum - startMonthNum);
        
        // Se a diferença de meses é menor que quantas parcelas já foram geradas, não gera ainda
        if (monthsDiff < generatedCount) {
          return false;
        }
      }

      // Calcular data de vencimento
      const [year, month] = currentMonth.split('-').map(Number);
      const dueDay = baseExpense.dueDay || 1;
      
      // Ajustar dia se for maior que o último dia do mês
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const adjustedDueDay = Math.min(dueDay, lastDayOfMonth);
      
      // Formatar data sem problema de timezone
      const dueDate = this.formatDateLocal(year, month, adjustedDueDay);

      // Para parceladas e financiamentos, calcular número da parcela e valor
      let title = baseExpense.title;
      let amount = baseExpense.amount;
      let currentInstallment = undefined;
      
      if ((baseExpense.type === 'installment' || baseExpense.type === 'financing') && baseExpense.totalInstallments) {
        // Calcular o número da parcela baseado na diferença de meses
        const startDate = new Date(baseExpense.dueDate);
        const [targetYear, targetMonthNum] = currentMonth.split('-').map(Number);
        const startYear = startDate.getFullYear();
        const startMonthNum = startDate.getMonth() + 1;
        
        const monthsDiff = (targetYear - startYear) * 12 + (targetMonthNum - startMonthNum);
        currentInstallment = monthsDiff + 1;
        
        // Verificar se já existe essa parcela específica
        const existingInstallment = await prisma.expense.findFirst({
          where: {
            parentExpenseId: baseExpense.id,
            currentInstallment: currentInstallment
          }
        });
        
        if (existingInstallment) {
          return false;
        }
        
        amount = baseExpense.amount / baseExpense.totalInstallments;
        title = `${baseExpense.title} (${currentInstallment}/${baseExpense.totalInstallments})`;
      }

      // Criar nova despesa para o mês atual
      const newExpense = await prisma.expense.create({
        data: {
          userId: baseExpense.userId,
          title,
          description: baseExpense.description,
          amount: Number(amount.toFixed(2)),
          category: baseExpense.category,
          type: baseExpense.type,
          dueDate: new Date(dueDate),
          dueDay: adjustedDueDay,
          status: 'PENDING',
          isPaid: false,
          referenceMonth: currentMonth,
          isRecurring: false,
          isGenerated: true,
          parentExpenseId: baseExpense.id,
          currentInstallment,
          totalInstallments: baseExpense.totalInstallments,
          notes: baseExpense.notes
        }
      });

      // Log apenas se gerou
      console.log(`✅ Gerada: ${newExpense.title}`);

      // Criar notificação (sem notificação por enquanto para não lotar)
      // await this.createExpenseNotification(newExpense);

      return true;
    } catch (error: any) {
      console.error(`❌ Erro ao gerar despesa ${baseExpense.title}:`, error);
      return false;
    }
  }



  /**
   * Cria notificação para uma nova despesa gerada
   */
  private async createExpenseNotification(expense: any): Promise<void> {
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
  private buildResultMessage(generated: number): string {
    if (generated === 0) {
      return 'Nenhuma pendência nova para gerar';
    }
    
    return `${generated} pendência${generated > 1 ? 's' : ''} gerada${generated > 1 ? 's' : ''}`;
  }
}
