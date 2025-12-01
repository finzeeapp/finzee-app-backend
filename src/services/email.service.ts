import nodemailer from 'nodemailer';
import { Expense } from '@prisma/client';

export interface ExpenseNotificationData {
  overdue: Expense[];
  dueSoon: Expense[];
  urgencyLevel: 'normal' | 'alert' | 'urgent';
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuração do Gmail SMTP com pool de conexões e timeout
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      pool: true, // Usa pool de conexões (mais rápido)
      maxConnections: 5, // Máximo de conexões simultâneas
      maxMessages: 100, // Mensagens por conexão
      rateDelta: 1000, // Tempo entre mensagens (1 segundo)
      rateLimit: 5, // Máximo de 5 mensagens por segundo
      connectionTimeout: 10000, // Timeout de 10 segundos
      greetingTimeout: 5000,
      socketTimeout: 15000
    });
  }

  /**
   * Envia notificação de despesas vencendo/atrasadas
   */
  async sendExpenseNotification(
    userEmail: string,
    userName: string,
    data: ExpenseNotificationData
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const { overdue, dueSoon, urgencyLevel } = data;
      
      // Não enviar se não houver despesas
      if (overdue.length === 0 && dueSoon.length === 0) {
        console.log(`📭 Sem despesas para notificar: ${userEmail}`);
        return false;
      }

      const subject = this.getEmailSubject(urgencyLevel, overdue.length, dueSoon.length);
      const html = this.buildEmailTemplate(userName, data);

      // Timeout de 10 segundos por e-mail
      const sendPromise = this.transporter.sendMail({
        from: `"Finzee - Controle Financeiro" <${process.env.GMAIL_USER}>`,
        to: userEmail,
        subject,
        html
      });

      await Promise.race([
        sendPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao enviar e-mail')), 10000)
        )
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ E-mail enviado para ${userEmail} em ${duration}ms`);
      return true;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Erro ao enviar e-mail para ${userEmail} após ${duration}ms:`, error.message);
      
      // Se for timeout ou erro de conexão, não trava o processo
      if (error.message.includes('Timeout') || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        console.log(`⏭️ Pulando ${userEmail} devido a timeout`);
      }
      
      return false;
    }
  }

  /**
   * Gera o assunto do e-mail baseado na urgência
   */
  private getEmailSubject(urgencyLevel: string, overdueCount: number, dueSoonCount: number): string {
    if (urgencyLevel === 'urgent') {
      return `🚨 URGENTE: ${overdueCount} conta(s) atrasada(s) - Finzee`;
    }
    
    if (urgencyLevel === 'alert') {
      const total = overdueCount + dueSoonCount;
      return `⚠️ Atenção: ${total} conta(s) requerem sua atenção - Finzee`;
    }
    
    return `🔔 Lembrete: ${dueSoonCount} conta(s) vencendo em breve - Finzee`;
  }

  /**
   * Constrói o template HTML do e-mail
   */
  private buildEmailTemplate(userName: string, data: ExpenseNotificationData): string {
    const { overdue, dueSoon, urgencyLevel } = data;
    
    const totalOverdue = overdue.reduce((sum, exp) => sum + exp.amount, 0);
    const totalDueSoon = dueSoon.reduce((sum, exp) => sum + exp.amount, 0);

    // Define cores e ícones baseado na urgência
    const urgencyConfig = {
      urgent: { color: '#dc2626', icon: '🚨', title: 'AÇÃO URGENTE NECESSÁRIA' },
      alert: { color: '#ea580c', icon: '⚠️', title: 'ATENÇÃO NECESSÁRIA' },
      normal: { color: '#2563eb', icon: '🔔', title: 'LEMBRETE FINANCEIRO' }
    };

    const config = urgencyConfig[urgencyLevel];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${config.color} 0%, ${this.darkenColor(config.color)} 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.95; font-size: 14px; }
    .content { padding: 30px 20px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #1f2937; }
    .summary { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 6px; }
    .summary-urgent { background-color: #fee2e2; border-left: 4px solid #dc2626; }
    .expense-section { margin: 25px 0; }
    .section-title { font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .expense-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; transition: all 0.2s; }
    .expense-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .expense-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
    .expense-title { font-weight: 600; color: #1f2937; font-size: 15px; }
    .expense-amount { font-size: 18px; font-weight: 700; color: ${config.color}; }
    .expense-details { font-size: 13px; color: #6b7280; }
    .expense-category { display: inline-block; background-color: #e0e7ff; color: #4f46e5; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-top: 8px; font-weight: 500; }
    .total-box { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .total-label { font-size: 14px; color: #6b7280; margin-bottom: 5px; }
    .total-amount { font-size: 28px; font-weight: 700; color: #1f2937; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, ${config.color} 0%, ${this.darkenColor(config.color)} 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .footer-links { margin-top: 12px; }
    .footer-links a { color: #4f46e5; text-decoration: none; margin: 0 8px; }
    .badge-overdue { background-color: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-due-soon { background-color: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    @media only screen and (max-width: 600px) {
      .container { border-radius: 0; }
      .content { padding: 20px 15px; }
      .expense-header { flex-direction: column; gap: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${config.icon} ${config.title}</h1>
      <p>Resumo das suas contas - ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Olá, ${userName}! 👋</div>

      ${overdue.length > 0 || dueSoon.length > 0 ? `
      <div class="summary ${urgencyLevel === 'urgent' || urgencyLevel === 'alert' ? 'summary-urgent' : ''}">
        <strong>📊 Resumo Rápido:</strong><br>
        ${overdue.length > 0 ? `<span style="color: #dc2626;">• ${overdue.length} conta(s) atrasada(s) - R$ ${this.formatCurrency(totalOverdue)}</span><br>` : ''}
        ${dueSoon.length > 0 ? `<span style="color: #ea580c;">• ${dueSoon.length} conta(s) vencendo em breve - R$ ${this.formatCurrency(totalDueSoon)}</span>` : ''}
      </div>
      ` : ''}

      <!-- Despesas Atrasadas -->
      ${overdue.length > 0 ? `
      <div class="expense-section">
        <div class="section-title">
          🚨 Contas Atrasadas (${overdue.length})
        </div>
        ${overdue.map(expense => this.buildExpenseCard(expense, 'overdue')).join('')}
        
        <div class="total-box" style="background: linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%);">
          <div class="total-label">Total em Atraso</div>
          <div class="total-amount" style="color: #dc2626;">R$ ${this.formatCurrency(totalOverdue)}</div>
        </div>
      </div>
      ` : ''}

      <!-- Despesas Vencendo -->
      ${dueSoon.length > 0 ? `
      <div class="expense-section">
        <div class="section-title">
          ⏰ Contas Vencendo em Breve (${dueSoon.length})
        </div>
        ${dueSoon.map(expense => this.buildExpenseCard(expense, 'due-soon')).join('')}
        
        <div class="total-box">
          <div class="total-label">Total a Vencer</div>
          <div class="total-amount" style="color: #ea580c;">R$ ${this.formatCurrency(totalDueSoon)}</div>
        </div>
      </div>
      ` : ''}

      <!-- Call to Action -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/expenses" class="cta-button">
          💼 Acessar Minhas Contas
        </a>
        <p style="font-size: 13px; color: #6b7280; margin-top: 15px;">
          💡 Dica: Pagar suas contas em dia evita juros e mantém seu controle financeiro em ordem!
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong>Finzee - Seu Controle Financeiro Pessoal</strong><br>
      Você está recebendo este e-mail porque ativou notificações de vencimento.<br>
      <div class="footer-links">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/profile">Configurações</a> •
        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/help">Ajuda</a>
      </div>
      <p style="margin-top: 15px; font-size: 11px; color: #9ca3af;">
        Este é um e-mail automático. Por favor, não responda.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Constrói um card de despesa
   */
  private buildExpenseCard(expense: Expense, type: 'overdue' | 'due-soon'): string {
    const dueDate = new Date(expense.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let dueDateText = '';
    if (type === 'overdue') {
      const daysOverdue = Math.abs(diffDays);
      dueDateText = `<span class="badge-overdue">Atrasado há ${daysOverdue} dia(s)</span>`;
    } else {
      dueDateText = `<span class="badge-due-soon">Vence em ${diffDays} dia(s)</span>`;
    }

    return `
      <div class="expense-card">
        <div class="expense-header">
          <div>
            <div class="expense-title">${expense.title}</div>
            <div class="expense-details">
              Vencimento: ${dueDate.toLocaleDateString('pt-BR')} ${dueDateText}
            </div>
            ${expense.description ? `<div class="expense-details">${expense.description}</div>` : ''}
            <span class="expense-category">${this.translateCategory(expense.category)}</span>
          </div>
          <div class="expense-amount">R$ ${this.formatCurrency(expense.amount)}</div>
        </div>
      </div>
    `;
  }

  /**
   * Formata valor monetário
   */
  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Traduz categoria
   */
  private translateCategory(category: string): string {
    const categories: Record<string, string> = {
      housing: '🏠 Moradia',
      food: '🍽️ Alimentação',
      transportation: '🚗 Transporte',
      health: '🏥 Saúde',
      education: '📚 Educação',
      entertainment: '🎮 Lazer',
      others: '📦 Outros',
      utilities: '💡 Utilidades',
      insurance: '🛡️ Seguros',
      debt: '💳 Dívidas'
    };
    return categories[category] || category;
  }

  /**
   * Escurece uma cor hex em 20%
   */
  private darkenColor(hex: string): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - 30);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - 30);
    const b = Math.max(0, (num & 0x0000FF) - 30);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Testa conexão SMTP
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Conexão SMTP verificada com sucesso');
      return true;
    } catch (error: any) {
      console.error('❌ Erro na conexão SMTP:', error.message);
      return false;
    }
  }
}
