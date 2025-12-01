import * as cron from 'node-cron';
import { DueDateCheckerService } from './due-date-checker.service';

export class DailyNotificationScheduler {
  private dueDateChecker = new DueDateCheckerService();
  private cronJob: any | null = null;

  /**
   * Inicia o scheduler para rodar todos os dias às 8h da manhã
   */
  start(): void {
    console.log('🕐 Iniciando scheduler de notificações diárias...');
    
    // Executa todos os dias às 8h da manhã (horário de Brasília)
    // Formato: minuto hora dia mês dia-da-semana
    // 0 8 * * * = às 8h de todos os dias
    this.cronJob = cron.schedule('0 8 * * *', async () => {
      console.log('📧 Executando verificação diária de vencimentos...');
      await this.executeNotifications();
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('✅ Scheduler de notificações iniciado! Executará às 8h diariamente (horário de Brasília).');
    console.log('⏰ Próxima execução:', this.getNextExecutionTime());
  }

  /**
   * Para o scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Scheduler de notificações parado.');
    }
  }

  /**
   * Executa as notificações
   */
  async executeNotifications(): Promise<void> {
    try {
      const startTime = Date.now();
      console.log('🚀 Iniciando envio de notificações...');
      
      const results = await this.dueDateChecker.checkAndNotifyAll();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const sentCount = results.filter(r => r.sent).length;
      const totalCount = results.length;
      
      console.log(`✅ Processo concluído em ${duration}s`);
      console.log(`📊 Resultado: ${sentCount}/${totalCount} notificações enviadas`);
      
      // Log detalhado
      if (results.length > 0) {
        console.log('\n📋 Detalhes:');
        results.forEach(result => {
          const icon = result.sent ? '✅' : '⏭️';
          console.log(`  ${icon} ${result.userEmail}: ${result.reason || 'Enviado'}`);
        });
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao executar notificações:', error.message);
    }
  }

  /**
   * Executa manualmente (para testes)
   */
  async executeManually(): Promise<{ success: boolean; message: string; results: any[] }> {
    try {
      console.log('🧪 Execução manual de notificações...');
      const results = await this.dueDateChecker.checkAndNotifyAll();
      
      const sentCount = results.filter(r => r.sent).length;
      
      return {
        success: true,
        message: `${sentCount}/${results.length} notificações enviadas`,
        results
      };
    } catch (error: any) {
      console.error('❌ Erro na execução manual:', error.message);
      return {
        success: false,
        message: `Erro: ${error.message}`,
        results: []
      };
    }
  }

  /**
   * Obtém o horário da próxima execução
   */
  private getNextExecutionTime(): string {
    // Criar data em UTC e converter para São Paulo (UTC-3)
    const now = new Date();
    
    // Converter para horário de São Paulo (UTC-3)
    const offsetSP = -3 * 60; // -3 horas em minutos
    const offsetLocal = now.getTimezoneOffset(); // offset local em minutos
    const diffMinutes = offsetLocal - offsetSP;
    
    const nowSP = new Date(now.getTime() + diffMinutes * 60000);
    const next = new Date(nowSP);
    
    next.setHours(8, 0, 0, 0);
    
    // Se já passou das 8h hoje em São Paulo, agenda para amanhã
    if (nowSP.getHours() >= 8) {
      next.setDate(next.getDate() + 1);
    }
    
    // Formatar manualmente para garantir horário correto
    const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const diaSemana = dias[next.getDay()];
    const dia = next.getDate();
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mes = meses[next.getMonth()];
    const ano = next.getFullYear();
    
    return `${diaSemana}, ${dia} de ${mes} de ${ano} às 08:00`;
  }

  /**
   * Verifica se o scheduler está rodando
   */
  isRunning(): boolean {
    return this.cronJob !== null;
  }
}
