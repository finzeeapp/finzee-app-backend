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
    console.log('🔧 Inicializando EmailService com Resend...');
    console.log('🔑 RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✓ Configurado' : '✗ NÃO CONFIGURADO');
    
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY não configurado!');
      throw new Error('RESEND_API_KEY é obrigatório');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'Finzee <onboarding@resend.dev>';
    
    console.log('✅ Resend Email Service inicializado');
    console.log('📧 From email:', this.fromEmail);
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

      console.log(`📤 Preparando envio para ${userEmail}...`);
      console.log(`   - Despesas atrasadas: ${overdue.length}`);
      console.log(`   - Despesas vencendo: ${dueSoon.length}`);
      console.log(`   - Nível de urgência: ${urgencyLevel}`);

      const subject = this.getEmailSubject(urgencyLevel, overdue.length, dueSoon.length);
      const html = this.buildEmailTemplate(userName, data);

      console.log(`📧 Enviando via Resend API...`);
      console.log(`   From: ${this.fromEmail}`);
      console.log(`   To: ${userEmail}`);
      console.log(`   Subject: ${subject}`);
      
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: userEmail,
        subject: subject,
        html: html
      });

      const duration = Date.now() - startTime;
      
      console.log(`📋 Resend Response:`, JSON.stringify(response, null, 2));
      
      if (response.error) {
        console.error(`❌ Erro Resend para ${userEmail}:`);
        console.error(`   - Mensagem: ${response.error.message}`);
        console.error(`   - Nome: ${response.error.name}`);
        console.error(`   - Objeto completo:`, JSON.stringify(response.error, null, 2));
        
        // Detectar email bounced (erro 550 ou "does not exist")
        const errorMessage = response.error.message?.toLowerCase() || '';
        const isBounced = 
          errorMessage.includes('does not exist') ||
          errorMessage.includes('bounce') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('550');
        
        if (isBounced) {
          console.warn(`🚫 Email bounced detectado para ${userEmail}, marcando no banco...`);
          try {
            await prisma.user.update({
              where: { email: userEmail },
              data: { emailBounced: true }
            });
            console.log(`✓ Usuário ${userEmail} marcado como emailBounced=true`);
          } catch (dbError: any) {
            console.error(`❌ Erro ao marcar emailBounced:`, dbError.message);
          }
        }
        
        return false;
      }

      console.log(`✅ E-mail enviado para ${userEmail} em ${duration}ms`);
      console.log(`   Email ID: ${response.data?.id}`);
      return true;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ ERRO ao enviar e-mail para ${userEmail} após ${duration}ms:`);
      console.error(`   - Mensagem: ${error.message}`);
      console.error(`   - Nome: ${error.name}`);
      
      if (error.statusCode) {
        console.error(`   - Status Code: ${error.statusCode}`);
      }
      
      // Detectar bounces em exceptions também
      const errorMessage = error.message?.toLowerCase() || '';
      const isBounced = 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('bounce') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('550') ||
        error.statusCode === 550;
      
      if (isBounced) {
        console.warn(`🚫 Email bounced detectado (exception) para ${userEmail}, marcando no banco...`);
        try {
          await prisma.user.update({
            where: { email: userEmail },
            data: { emailBounced: true }
          });
          console.log(`✓ Usuário ${userEmail} marcado como emailBounced=true`);
        } catch (dbError: any) {
          console.error(`❌ Erro ao marcar emailBounced:`, dbError.message);
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #fff; }
    .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 32px 24px; text-align: center; color: white; }
    .logo { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .header-subtitle { font-size: 14px; opacity: 0.9; }
    .content { padding: 24px; }
    .greeting { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px; }
    .summary-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .summary-title { font-size: 14px; font-weight: 600; color: #92400E; margin-bottom: 4px; }
    .summary-text { font-size: 16px; color: #B45309; font-weight: 600; }
    .section-title { font-size: 18px; font-weight: 700; color: #111827; margin: 24px 0 12px; }
    .expense-card { background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .expense-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .expense-title { font-size: 16px; font-weight: 600; color: #111827; }
    .expense-amount { font-size: 20px; font-weight: 700; color: #3B82F6; white-space: nowrap; margin-left: 12px; }
    .expense-info { font-size: 14px; color: #6B7280; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .badge-warning { background-color: #FEF3C7; color: #92400E; }
    .category-badge { background-color: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 16px; font-size: 12px; margin-top: 8px; display: inline-block; }
    .total-box { background-color: #F3F4F6; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center; }
    .total-label { font-size: 14px; color: #6B7280; margin-bottom: 4px; }
    .total-amount { font-size: 32px; font-weight: 700; color: #EF4444; }
    .cta-button { display: block; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white !important; text-decoration: none; padding: 16px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .tip-box { background-color: #FEF9C3; border-left: 4px solid #EAB308; padding: 12px 16px; border-radius: 8px; margin: 20px 0; }
    .tip-text { font-size: 14px; color: #713F12; }
    .footer { background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB; }
    .footer-text { font-size: 13px; color: #6B7280; line-height: 1.6; }
    .footer-brand { font-weight: 600; color: #3B82F6; margin-top: 8px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 16px !important; }
      .expense-row { flex-direction: column; gap: 4px; }
      .expense-amount { margin-left: 0; }
      .total-amount { font-size: 28px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">💰 Finzee</div>
      <div class="header-subtitle">Seu Controle Financeiro Pessoal</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Olá, ${userName}! 👋</div>

      ${overdue.length > 0 || dueSoon.length > 0 ? `
      <div class="summary-box">
        <div class="summary-title">📊 Resumo Rápido:</div>
        <div class="summary-text">
          ${overdue.length > 0 ? `• ${overdue.length} conta(s) atrasada(s) - R$ ${this.formatCurrency(totalOverdue)}<br>` : ''}
          ${dueSoon.length > 0 ? `• ${dueSoon.length} conta(s) vencendo em breve - R$ ${this.formatCurrency(totalDueSoon)}` : ''}
        </div>
      </div>
      ` : ''}

      ${dueSoon.length > 0 ? `
      <div class="section-title">⏰ Contas Vencendo em Breve (${dueSoon.length})</div>
      ${dueSoon.map(expense => this.buildExpenseCard(expense, 'due-soon')).join('')}
      ` : ''}

      ${overdue.length > 0 ? `
      <div class="section-title">🚨 Contas Atrasadas (${overdue.length})</div>
      ${overdue.map(expense => this.buildExpenseCard(expense, 'overdue')).join('')}
      ` : ''}

      ${(overdue.length > 0 || dueSoon.length > 0) ? `
      <div class="total-box">
        <div class="total-label">Total a Vencer</div>
        <div class="total-amount">R$ ${this.formatCurrency(totalOverdue + totalDueSoon)}</div>
      </div>
      ` : ''}

      <a href="${process.env.FRONTEND_URL || 'https://finzee.vercel.app'}/tabs/expenses" class="cta-button">
        💼 Acessar Minhas Contas
      </a>

      <div class="tip-box">
        <div class="tip-text">💡 Dica: Pagar suas contas em dia evita juros e mantém seu controle financeiro em ordem!</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">💰 Finzee</div>
      <div class="footer-text">
        Você está recebendo este e-mail porque ativou notificações de vencimento.<br>
        <a href="${process.env.FRONTEND_URL || 'https://finzee.vercel.app'}/tabs/profile" style="color: #3B82F6; text-decoration: none;">Configurações</a> •
        <a href="https://finzee.com.br" style="color: #3B82F6; text-decoration: none;">Ajuda</a>
      </div>
      <div class="footer-text" style="margin-top: 12px; font-size: 11px; color: #9CA3AF;">
        Este é um e-mail automático. Por favor, não responda.
      </div>
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
    
    const badgeText = type === 'overdue' 
      ? `VENCE EM ${Math.abs(diffDays)} DIA(S)` 
      : `VENCE EM ${diffDays} DIA(S)`;

    return `
      <div class="expense-card">
        <div class="expense-row">
          <div style="flex: 1;">
            <div class="expense-title">${expense.title}</div>
            <div class="expense-info">Vencimento: ${dueDate.toLocaleDateString('pt-BR')}</div>
            <span class="category-badge">${this.translateCategory(expense.category)}</span>
          </div>
          <div class="expense-amount">R$<br>${this.formatCurrency(expense.amount)}</div>
        </div>
        <div style="margin-top: 8px;">
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
