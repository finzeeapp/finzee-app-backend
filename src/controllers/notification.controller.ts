import { Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { DailyNotificationScheduler } from '../services/daily-notification.scheduler';

export class NotificationController {
  private notificationService = new NotificationService();
  private dailyNotificationScheduler = new DailyNotificationScheduler();

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const notifications = await this.notificationService.findAll(req.userId);
      res.json(notifications);
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      await this.notificationService.markAsRead(req.params.id, req.userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async testEmailNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      console.log('🧪 Testando envio de notificação por e-mail...');
      const result = await this.dailyNotificationScheduler.executeManually();
      
      res.json({
        success: result.success,
        message: result.message,
        details: result.results
      });
    } catch (error: any) {
      console.error('Erro ao testar notificação:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async testDirectEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      console.log('🧪 Teste direto de e-mail para usuário:', req.userId);
      
      // Importar serviços
      const { EmailService } = require('../services/email.service');
      const { prisma } = require('../services/prisma.service');
      const emailService = new EmailService();
      
      // Verificar configuração SMTP
      console.log('📧 GMAIL_USER:', process.env.GMAIL_USER ? '✓ Configurado' : '✗ NÃO configurado');
      console.log('📧 GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✓ Configurado' : '✗ NÃO configurado');
      
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        res.status(400).json({
          success: false,
          error: 'Variáveis GMAIL_USER ou GMAIL_APP_PASSWORD não configuradas no .env'
        });
        return;
      }

      // Testar conexão SMTP
      console.log('🔌 Testando conexão SMTP...');
      const connected = await emailService.testConnection();
      
      if (!connected) {
        res.status(400).json({
          success: false,
          error: 'Falha na conexão SMTP. Verifique GMAIL_USER e GMAIL_APP_PASSWORD'
        });
        return;
      }
      console.log('✅ Conexão SMTP OK');

      // Buscar usuário e despesas
      console.log('👤 Buscando dados do usuário...');
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { 
          expenses: { 
            where: { isPaid: false },
            orderBy: { dueDate: 'asc' }
          } 
        }
      });

      if (!user) {
        res.status(404).json({ 
          success: false,
          error: 'Usuário não encontrado' 
        });
        return;
      }

      console.log(`👤 Usuário: ${user.name} (${user.email})`);
      console.log(`💳 Despesas não pagas: ${user.expenses.length}`);

      // Se não tiver despesas, criar dados fictícios para teste
      let expensesToShow = user.expenses;
      let isFakeData = false;
      
      if (expensesToShow.length === 0) {
        console.log('⚠️ Sem despesas reais, criando dados fictícios para teste...');
        isFakeData = true;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        expensesToShow = [
          {
            id: 'test-1',
            userId: user.id,
            title: 'Conta de Luz (TESTE)',
            description: 'Exemplo de conta vencendo em breve',
            amount: 150.50,
            category: 'utilities',
            type: 'single',
            dueDate: tomorrow,
            status: 'PENDING',
            isPaid: false,
          } as any,
          {
            id: 'test-2',
            userId: user.id,
            title: 'Internet (TESTE)',
            description: 'Exemplo de conta vencendo',
            amount: 99.90,
            category: 'utilities',
            type: 'single',
            dueDate: tomorrow,
            status: 'PENDING',
            isPaid: false,
          } as any
        ];
      }

      // Categorizar despesas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdue = expensesToShow.filter((e: any) => {
        const dueDate = new Date(e.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });

      const dueSoon = expensesToShow.filter((e: any) => {
        const dueDate = new Date(e.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      });

      console.log(`📊 Atrasadas: ${overdue.length}, Vencendo: ${dueSoon.length}`);

      // Forçar envio mesmo sem despesas
      if (overdue.length === 0 && dueSoon.length === 0 && !isFakeData) {
        res.json({
          success: false,
          message: 'Você não tem despesas pendentes para notificar',
          userEmail: user.email,
          suggestion: 'Crie uma despesa com vencimento próximo e teste novamente'
        });
        return;
      }

      // Enviar e-mail
      console.log('📧 Enviando e-mail...');
      const sent = await emailService.sendExpenseNotification(
        user.email,
        user.name,
        {
          overdue,
          dueSoon,
          urgencyLevel: overdue.length > 0 ? 'alert' : 'normal'
        }
      );

      if (sent) {
        console.log('✅ E-mail enviado com sucesso!');
        res.json({
          success: true,
          message: `E-mail de teste enviado para ${user.email}${isFakeData ? ' (com dados fictícios)' : ''}`,
          sentTo: user.email,
          expensesCount: {
            overdue: overdue.length,
            dueSoon: dueSoon.length
          },
          isFakeData
        });
      } else {
        console.log('❌ Falha no envio do e-mail');
        res.status(500).json({
          success: false,
          error: 'Falha ao enviar e-mail. Verifique os logs do servidor.'
        });
      }

    } catch (error: any) {
      console.error('❌ Erro no teste direto:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.stack
      });
    }
  }
}
