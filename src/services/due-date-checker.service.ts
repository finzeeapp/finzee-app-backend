import { prisma } from './prisma.service';
import { Expense, User } from '@prisma/client';
import { EmailService, ExpenseNotificationData } from './email.service';

interface NotificationResult {
  userId: string;
  userEmail: string;
  sent: boolean;
  reason?: string;
}

export class DueDateCheckerService {
  private emailService = new EmailService();

  /**
   * Verifica e envia notificações para todos os usuários
   */
  async checkAndNotifyAll(): Promise<NotificationResult[]> {
    const startTime = Date.now();
    console.log('🔍 Iniciando verificação de vencimentos...');
    
    // Verificar quantos usuários estão com email bounced
    const bouncedCount = await prisma.user.count({
      where: {
        emailNotificationsEnabled: true,
        emailBounced: true
      }
    });
    
    if (bouncedCount > 0) {
      console.log(`🚫 ${bouncedCount} usuário(s) com email bounced (serão ignorados)`);
    }
    
    const users = await prisma.user.findMany({
      where: {
        emailNotificationsEnabled: true,
        emailBounced: false
      },
      include: {
        expenses: {
          where: {
            isPaid: false,
            status: {
              in: ['PENDING', 'OVERDUE']
            }
          }
        }
      }
    });

    console.log(`👥 ${users.length} usuário(s) com notificações ativadas (emails válidos)`);

    // Processar usuários em PARALELO (máximo 3 por vez)
    const batchSize = 3;
    const results: NotificationResult[] = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(`📦 Processando batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}...`);
      
      const batchResults = await Promise.all(
        batch.map(user => this.checkAndNotifyUser(user))
      );
      
      results.push(...batchResults);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const sentCount = results.filter(r => r.sent).length;
    console.log(`✅ ${sentCount}/${users.length} notificações enviadas em ${duration}s`);

    return results;
  }

  /**
   * Verifica e notifica um usuário específico
   */
  async checkAndNotifyUser(user: User & { expenses: Expense[] }): Promise<NotificationResult> {
    const startTime = Date.now();
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Verifica se já foi notificado hoje (SKIP para teste)
      const lastNotificationDate = user.lastNotificationSent 
        ? new Date(user.lastNotificationSent)
        : null;

      if (lastNotificationDate) {
        lastNotificationDate.setHours(0, 0, 0, 0);
        if (lastNotificationDate.getTime() === today.getTime()) {
          console.log(`⏭️ ${user.email}: Já notificado hoje`);
          return {
            userId: user.id,
            userEmail: user.email,
            sent: false,
            reason: 'Já notificado hoje'
          };
        }
      }

      // Categoriza despesas
      const { overdue, dueSoon } = this.categorizeExpenses(
        user.expenses,
        user.notificationDaysBefore || 3
      );

      // Define nível de urgência
      const urgencyLevel = this.determineUrgencyLevel(overdue, user.lastNotificationSent);

      // Verifica regras de envio
      const shouldSend = this.shouldSendNotification(overdue, dueSoon, user.lastNotificationSent);

      if (!shouldSend) {
        return {
          userId: user.id,
          userEmail: user.email,
          sent: false,
          reason: 'Nenhuma despesa para notificar ou fora do período de envio'
        };
      }

      // Monta dados da notificação
      const notificationData: ExpenseNotificationData = {
        overdue,
        dueSoon,
        urgencyLevel
      };

      // Envia e-mail
      const emailSent = await this.emailService.sendExpenseNotification(
        user.email,
        user.name,
        notificationData
      );

      if (emailSent) {
        // Atualiza data da última notificação
        await prisma.user.update({
          where: { id: user.id },
          data: { lastNotificationSent: new Date() }
        });

        // Registra log de notificação
        await this.logNotification(user.id, overdue.length, dueSoon.length, urgencyLevel);
      }

      return {
        userId: user.id,
        userEmail: user.email,
        sent: emailSent,
        reason: emailSent ? 'Notificação enviada com sucesso' : 'Falha no envio do e-mail'
      };

    } catch (error: any) {
      console.error(`❌ Erro ao processar usuário ${user.email}:`, error.message);
      return {
        userId: user.id,
        userEmail: user.email,
        sent: false,
        reason: `Erro: ${error.message}`
      };
    }
  }

  /**
   * Categoriza despesas em atrasadas e vencendo
   */
  private categorizeExpenses(
    expenses: Expense[],
    notificationDaysBefore: number
  ): { overdue: Expense[]; dueSoon: Expense[] } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue: Expense[] = [];
    const dueSoon: Expense[] = [];

    for (const expense of expenses) {
      const dueDate = new Date(expense.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Atrasada
        overdue.push(expense);
      } else if (diffDays <= notificationDaysBefore) {
        // Vencendo em breve (dentro do período configurado)
        dueSoon.push(expense);
      }
    }

    // Ordena por data de vencimento
    overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    dueSoon.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return { overdue, dueSoon };
  }

  /**
   * Determina o nível de urgência da notificação
   */
  private determineUrgencyLevel(
    overdue: Expense[],
    lastNotificationSent: Date | null
  ): 'normal' | 'alert' | 'urgent' {
    if (overdue.length === 0) {
      return 'normal'; // Apenas lembretes de vencimento
    }

    if (!lastNotificationSent) {
      return 'alert'; // Primeira notificação de atraso
    }

    const today = new Date();
    const lastNotification = new Date(lastNotificationSent);
    const daysSinceLastNotification = Math.floor(
      (today.getTime() - lastNotification.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Urgente: depois de 2 dias de atraso ou a cada 5 dias
    if (daysSinceLastNotification >= 5 || 
        overdue.some(exp => {
          const dueDate = new Date(exp.dueDate);
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysOverdue >= 2;
        })) {
      return 'urgent';
    }

    return 'alert';
  }

  /**
   * Determina se deve enviar notificação baseado nas regras:
   * - Despesas vencendo: envia diariamente dentro do período configurado (até 5 dias antes)
   * - Despesas atrasadas: envia por 2 dias seguidos após vencimento
   * - Após 2 dias: envia a cada 5 dias se ainda houver despesas atrasadas
   * - Não envia se não houver despesas
   */
  private shouldSendNotification(
    overdue: Expense[],
    dueSoon: Expense[],
    lastNotificationSent: Date | null
  ): boolean {
    // Sem despesas = não envia
    if (overdue.length === 0 && dueSoon.length === 0) {
      return false;
    }

    // Tem despesas vencendo = sempre envia (diariamente)
    if (dueSoon.length > 0) {
      return true;
    }

    // Apenas despesas atrasadas
    if (overdue.length > 0) {
      if (!lastNotificationSent) {
        return true; // Primeira notificação
      }

      const today = new Date();
      const lastNotification = new Date(lastNotificationSent);
      const daysSinceLastNotification = Math.floor(
        (today.getTime() - lastNotification.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Primeiros 2 dias: envia diariamente
      const oldestOverdueDate = overdue.reduce((oldest, exp) => {
        const dueDate = new Date(exp.dueDate);
        return dueDate < oldest ? dueDate : oldest;
      }, new Date());

      const daysOverdue = Math.floor(
        (today.getTime() - oldestOverdueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 2) {
        return true; // Envia todos os dias nos primeiros 2 dias de atraso
      }

      // Após 2 dias: envia a cada 5 dias
      if (daysSinceLastNotification >= 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Registra log de notificação enviada
   */
  private async logNotification(
    userId: string,
    overdueCount: number,
    dueSoonCount: number,
    urgencyLevel: string
  ): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          userId,
          type: 'EMAIL',
          overdueCount,
          dueSoonCount,
          urgencyLevel,
          sentAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('Erro ao registrar log de notificação:', error.message);
    }
  }

  /**
   * Obtém histórico de notificações de um usuário
   */
  async getNotificationHistory(userId: string, limit: number = 10) {
    return prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: limit
    });
  }
}
