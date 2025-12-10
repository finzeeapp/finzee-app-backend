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

    try {
      // 1. Buscar todas as despesas registradas (templates) do usuário
      const registeredExpenses = await prisma.expense.findMany({
        where: {
          userId,
          isRecurring: true
        }
      });

      // 2. Processar TODAS as despesas em lote de uma vez
      const generatedCount = await this.generateMonthlyExpensesBatch(registeredExpenses, currentMonth);

      const message = this.buildResultMessage(generatedCount);

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
   * Gera despesas mensais em lote (otimizado para performance)
   * Processa todas as despesas de uma vez com queries em lote
   */
  private async generateMonthlyExpensesBatch(baseExpenses: any[], currentMonth: string): Promise<number> {
    try {
      if (baseExpenses.length === 0) return 0;

      const [year, month] = currentMonth.split('-').map(Number);
      const parentIds = baseExpenses.map(e => e.id);

      // 1. CONSULTA EM LOTE: Buscar todas as despesas já geradas de uma vez
      const existingExpenses = await prisma.expense.findMany({
        where: {
          parentExpenseId: { in: parentIds },
          OR: [
            { referenceMonth: currentMonth },
            { isGenerated: true }
          ]
        },
        select: {
          id: true,
          parentExpenseId: true,
          referenceMonth: true,
          currentInstallment: true,
          isGenerated: true
        }
      });

      // 2. Criar mapas para consultas rápidas em memória
      const expensesInCurrentMonth = new Set(
        existingExpenses
          .filter(e => e.referenceMonth === currentMonth)
          .map(e => e.parentExpenseId)
      );

      const installmentsByParent = existingExpenses.reduce((acc, e) => {
        if (!acc[e.parentExpenseId!]) {
          acc[e.parentExpenseId!] = {
            generatedCount: 0,
            installments: new Set<number>()
          };
        }
        if (e.isGenerated) acc[e.parentExpenseId!].generatedCount++;
        if (e.currentInstallment) acc[e.parentExpenseId!].installments.add(e.currentInstallment);
        return acc;
      }, {} as Record<string, { generatedCount: number; installments: Set<number> }>);

      // 3. Preparar dados para criação em lote
      const expensesToCreate: any[] = [];

      for (const baseExpense of baseExpenses) {
        // Verificar se já existe para este mês
        if (expensesInCurrentMonth.has(baseExpense.id)) {
          continue;
        }

        let shouldGenerate = true;
        let currentInstallment: number | undefined = undefined;
        let title = baseExpense.title;
        let amount = baseExpense.amount;

        // Lógica para parceladas e financiamentos
        if ((baseExpense.type === 'installment' || baseExpense.type === 'financing') && baseExpense.totalInstallments) {
          const installmentInfo = installmentsByParent[baseExpense.id] || { generatedCount: 0, installments: new Set() };

          // Se já gerou todas as parcelas, não gera mais
          if (installmentInfo.generatedCount >= baseExpense.totalInstallments) {
            continue;
          }

          // Calcular qual parcela deve ser gerada
          const startDate = new Date(baseExpense.dueDate);
          const startYear = startDate.getFullYear();
          const startMonthNum = startDate.getMonth() + 1;
          
          const monthsDiff = (year - startYear) * 12 + (month - startMonthNum);
          
          // Se a diferença de meses é menor que quantas parcelas já foram geradas, não gera ainda
          if (monthsDiff < installmentInfo.generatedCount) {
            continue;
          }

          currentInstallment = monthsDiff + 1;

          // Verificar se essa parcela específica já existe
          if (installmentInfo.installments.has(currentInstallment)) {
            continue;
          }

          amount = baseExpense.amount / baseExpense.totalInstallments;
          title = `${baseExpense.title} (${currentInstallment}/${baseExpense.totalInstallments})`;
        }

        if (!shouldGenerate) continue;

        // Calcular data de vencimento
        const dueDay = baseExpense.dueDay || 1;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const adjustedDueDay = Math.min(dueDay, lastDayOfMonth);
        const dueDate = this.formatDateLocal(year, month, adjustedDueDay);

        // Adicionar à lista de despesas a criar
        const expenseData = {
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
        };

        expensesToCreate.push(expenseData);
      }

      // 4. CRIAR TODAS AS DESPESAS DE UMA VEZ
      if (expensesToCreate.length === 0) {
        return 0;
      }

      const createdExpenses = await prisma.$transaction(
        expensesToCreate.map(data => prisma.expense.create({ data }))
      );

      console.log(`✅ ${createdExpenses.length} nova${createdExpenses.length > 1 ? 's' : ''} pendência${createdExpenses.length > 1 ? 's' : ''} gerada${createdExpenses.length > 1 ? 's' : ''}`);

      // 5. CRIAR NOTIFICAÇÕES EM LOTE
      const notifications = createdExpenses.map(expense => ({
        userId: expense.userId,
        title: 'Nova Pendência Gerada',
        message: `A despesa "${expense.title}" foi adicionada às suas pendências do mês com vencimento em ${new Date(expense.dueDate).toLocaleDateString('pt-BR')}.`,
        type: 'expense_generated',
        relatedEntityId: expense.id
      }));

      await Promise.all(
        notifications.map(notif => this.notificationService.create(notif))
      );

      return createdExpenses.length;

    } catch (error: any) {
      console.error(`❌ Erro ao gerar despesas em lote:`, error);
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
        console.log(`⏭️  Despesa já existe para ${baseExpense.title} no mês ${currentMonth}`);
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
          console.log(`✅ Todas as parcelas de ${baseExpense.title} já foram geradas`);
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
          console.log(`⏭️  Ainda não é o mês de gerar parcela ${generatedCount + 1} de ${baseExpense.title}`);
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
          console.log(`⏭️  Parcela ${currentInstallment} já existe para ${baseExpense.title}`);
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
