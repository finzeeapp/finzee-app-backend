import { Resend } from 'resend';
import { Expense } from '@prisma/client';
import { prisma } from './prisma.service';

export interface ExpenseNotificationData {
  overdue: Expense[];
  dueSoon: Expense[];
  urgencyLevel: 'normal' | 'alert' | 'urgent';
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY é obrigatório');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'Finzee <onboarding@resend.dev>';
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
        return false;
      }

      const subject = this.getEmailSubject(urgencyLevel, overdue.length, dueSoon.length);
      const html = this.buildEmailTemplate(userName, data);
      
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: userEmail,
        subject: subject,
        html: html
      });
      
      if (response.error) {
        console.error(`❌ Erro ao enviar email para ${userEmail}: ${response.error.message}`);
        
        // Detectar email bounced (erro 550 ou "does not exist")
        const errorMessage = response.error.message?.toLowerCase() || '';
        const isBounced = 
          errorMessage.includes('does not exist') ||
          errorMessage.includes('bounce') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('550');
        
        if (isBounced) {
          try {
            await prisma.user.update({
              where: { email: userEmail },
              data: { emailBounced: true }
            });
            console.log(`🚫 Email bounced: ${userEmail}`);
          } catch (dbError: any) {
            console.error(`Erro ao marcar emailBounced: ${dbError.message}`);
          }
        }
        
        return false;
      }

      return true;
      
    } catch (error: any) {
      console.error(`❌ Erro ao enviar email para ${userEmail}: ${error.message}`);
      
      // Detectar bounces em exceptions também
      const errorMessage = error.message?.toLowerCase() || '';
      const isBounced = 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('bounce') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('550') ||
        error.statusCode === 550;
      
      if (isBounced) {
        try {
          await prisma.user.update({
            where: { email: userEmail },
            data: { emailBounced: true }
          });
          console.log(`🚫 Email bounced: ${userEmail}`);
        } catch (dbError: any) {
          console.error(`Erro ao marcar emailBounced: ${dbError.message}`);
        }
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
    const { overdue, dueSoon } = data;
    
    const totalOverdue = overdue.reduce((sum, exp) => sum + exp.amount, 0);
    const totalDueSoon = dueSoon.reduce((sum, exp) => sum + exp.amount, 0);
    const totalAmount = totalOverdue + totalDueSoon;
    const totalCount = overdue.length + dueSoon.length;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F3F4F6;
      padding: 20px 0;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #F3F4F6;
    }
    .header { 
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 12px 12px 0 0;
    }
    .header-logo { 
      font-size: 28px;
      margin-bottom: 4px;
    }
    .header-title { 
      color: white;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    }
    .header-subtitle { 
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      margin-top: 4px;
    }
    .content { 
      background: white;
      padding: 24px 20px;
    }
    .greeting { 
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .summary-card { 
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .summary-label { 
      font-size: 12px;
      font-weight: 600;
      color: #92400E;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .summary-value { 
      font-size: 14px;
      color: #78350F;
      font-weight: 600;
      line-height: 1.6;
    }
    .section-header { 
      display: flex;
      align-items: center;
      margin: 24px 0 12px;
    }
    .section-icon { 
      font-size: 20px;
      margin-right: 8px;
    }
    .section-title { 
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }
    .expense-card { 
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .expense-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .expense-title { 
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 6px;
    }
    .expense-date { 
      font-size: 13px;
      color: #6B7280;
    }
    .expense-amount { 
      font-size: 18px;
      font-weight: 700;
      color: #3B82F6;
      text-align: right;
      white-space: nowrap;
    }
    .expense-amount-label {
      font-size: 11px;
      color: #6B7280;
      font-weight: 500;
    }
    .expense-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .badge { 
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-category { 
      background: #DBEAFE;
      color: #1E40AF;
    }
    .badge-warning { 
      background: #FEF3C7;
      color: #92400E;
    }
    .total-card { 
      background: #F9FAFB;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .total-label { 
      font-size: 13px;
      color: #6B7280;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .total-amount { 
      font-size: 32px;
      font-weight: 700;
      color: #EF4444;
    }
    .cta-button { 
      display: block;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white !important;
      text-decoration: none;
      padding: 16px 24px;
      border-radius: 12px;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
    }
    .tip-card { 
      background: linear-gradient(135deg, #FEF9C3 0%, #FDE68A 100%);
      border-radius: 12px;
      padding: 14px 16px;
      margin: 20px 0;
    }
    .tip-text { 
      font-size: 13px;
      color: #78350F;
      line-height: 1.5;
    }
    .footer { 
      background: white;
      padding: 24px 20px;
      text-align: center;
      border-radius: 0 0 12px 12px;
      border-top: 1px solid #E5E7EB;
    }
    .footer-text { 
      font-size: 12px;
      color: #6B7280;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .footer-link { 
      color: #3B82F6;
      text-decoration: none;
      font-weight: 500;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .content { padding: 20px 16px !important; }
      .header { padding: 24px 16px !important; }
      .expense-header { flex-direction: column; gap: 8px; }
      .expense-amount { text-align: left; font-size: 20px; }
      .total-amount { font-size: 28px !important; }
      .expense-footer { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-logo">💰</div>
      <h1 class="header-title">Finzee</h1>
      <p class="header-subtitle">Seu Controle Financeiro Pessoal</p>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Olá, ${userName}! 👋</div>

      <!-- Resumo Rápido -->
      <div class="summary-card">
        <div class="summary-label">📊 Resumo Rápido:</div>
        <div class="summary-value">
          • ${totalCount} conta(s) vencendo em breve - R$ ${this.formatCurrency(totalAmount)}
        </div>
      </div>

      <!-- Seção: Contas Vencendo em Breve -->
      ${dueSoon.length > 0 ? `
      <div class="section-header">
        <span class="section-icon">⏰</span>
        <span class="section-title">Contas Vencendo em Breve (${dueSoon.length})</span>
      </div>
      ${dueSoon.map(expense => this.buildExpenseCard(expense, 'due-soon')).join('')}
      ` : ''}

      <!-- Total a Vencer -->
      <div class="total-card">
        <div class="total-label">Total a Vencer</div>
        <div class="total-amount">R$ ${this.formatCurrency(totalAmount)}</div>
      </div>

      <!-- Call to Action -->
      <a href="https://finzee.com.br" class="cta-button">
        💼 Acessar Minhas Contas
      </a>

      <!-- Dica -->
      <div class="tip-card">
        <div class="tip-text">💡 Dica: Pagar suas contas em dia evita juros e mantém seu controle financeiro em ordem!</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        Você está recebendo este e-mail porque ativou notificações de vencimento.
      </p>
      <p class="footer-text">
        <a href="https://finzee.com.br" class="footer-link">Configurações</a>
      </p>
      <p class="footer-text" style="margin-top: 12px; font-size: 11px; color: #9CA3AF;">
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
    
    const badgeText = diffDays === 1 
      ? 'VENCE EM 1 DIA(S)' 
      : `VENCE EM ${diffDays} DIA(S)`;

    return `
      <div class="expense-card">
        <div class="expense-header">
          <div style="flex: 1;">
            <div class="expense-title">${expense.title}</div>
            <div class="expense-date">Vencimento: ${dueDate.toLocaleDateString('pt-BR')}</div>
          </div>
          <div>
            <div class="expense-amount">R$ ${this.formatCurrency(expense.amount)}</div>
          </div>
        </div>
        <div class="expense-footer">
          <span class="badge badge-category">${this.translateCategory(expense.category)}</span>
          <span class="badge badge-warning">${badgeText}</span>
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
      housing: 'Moradia',
      food: 'Alimentação',
      transportation: 'Transporte',
      health: 'Saúde',
      education: 'Educação',
      entertainment: 'Lazer',
      others: 'Outros',
      utilities: 'Utilidades',
      insurance: 'Seguros',
      debt: 'Dívidas'
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
   * Testa conexão com Resend API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando API Key do Resend...');
      
      // Tenta enviar um email de teste para validar a API key
      // Resend não tem método verify() como Nodemailer, então testamos enviando
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: 'test@resend.dev', // Email de teste do Resend
        subject: 'Test Connection',
        html: '<p>Connection test</p>'
      });
      
      if (response.error) {
        console.error('❌ Erro ao testar Resend:', response.error);
        return false;
      }
      
      console.log('✅ Resend API Key válida');
      return true;
    } catch (error: any) {
      console.error('❌ Erro na conexão Resend:', error.message);
      return false;
    }
  }
}
