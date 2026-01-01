import { prisma } from './prisma.service';
import { IncomeService } from './income.service';
import * as cron from 'node-cron';

/**
 * Service responsável por resetar as entradas de renda no início de cada mês
 * 
 * Comportamento:
 * - FIXED: Não faz nada (renda fixa continua usando monthlyIncome cadastrado)
 * - VARIABLE: Arquiva entradas do mês anterior (histórico mantido)
 */
export class IncomeResetService {
  private incomeService = new IncomeService();
  private cronJob: any | null = null;
  private isExecuting: boolean = false; // Flag para prevenir execuções paralelas

  /**
   * Executa o reset mensal de entradas
   * Deve ser chamado no dia 1 de cada mês
   */
  async executeMonthlyReset(): Promise<{
    success: boolean;
    message: string;
    usersProcessed: number;
    incomesArchived: number;
  }> {
    // Verificar se já está executando
    if (this.isExecuting) {
      console.log('⚠️ Reset mensal já está em execução. Aguarde a conclusão.');
      return {
        success: false,
        message: 'Reset já está em execução',
        usersProcessed: 0,
        incomesArchived: 0
      };
    }

    this.isExecuting = true;

    try {
      console.log('💰 ==========================================');
      console.log('💰 INICIANDO RESET MENSAL DE ENTRADAS');
      console.log('💰 ==========================================');

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Calcular mês anterior
      let previousMonth = currentMonth - 1;
      let previousYear = currentYear;
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = currentYear - 1;
      }

      const previousMonthStart = new Date(previousYear, previousMonth - 1, 1);
      const previousMonthEnd = new Date(currentYear, currentMonth - 1, 1);

      console.log(`📅 Processando entradas de: ${previousYear}-${previousMonth.toString().padStart(2, '0')}`);

      // Buscar todos os usuários com renda variável
      const variableIncomeUsers = await prisma.user.findMany({
        where: {
          incomeType: 'VARIABLE'
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      console.log(`👥 Encontrados ${variableIncomeUsers.length} usuários com renda variável`);

      let incomesArchived = 0;

      for (const user of variableIncomeUsers) {
        console.log(`\n👤 Processando usuário: ${user.name} (${user.email})`);

        // Buscar entradas do mês anterior
        const previousMonthIncomes = await prisma.income.findMany({
          where: {
            userId: user.id,
            date: {
              gte: previousMonthStart,
              lt: previousMonthEnd
            }
          }
        });

        if (previousMonthIncomes.length > 0) {
          const totalIncome = previousMonthIncomes.reduce((sum, income) => sum + Number(income.amount), 0);
          
          console.log(`  💵 Entradas do mês anterior: ${previousMonthIncomes.length}`);
          console.log(`  💰 Total: R$ ${totalIncome.toFixed(2)}`);
          
          // Por enquanto, as entradas ficam no banco como histórico
          // Em uma implementação futura, podemos adicionar um campo "archived" ou "month" para melhor organização
          incomesArchived += previousMonthIncomes.length;
          
          console.log(`  ✅ Entradas mantidas no histórico`);
        } else {
          console.log(`  ℹ️  Nenhuma entrada encontrada no mês anterior`);
        }
      }

      // Usuários com renda fixa não precisam de processamento
      const fixedIncomeUsersCount = await prisma.user.count({
        where: {
          incomeType: 'FIXED'
        }
      });

      console.log(`\n📊 Usuários com renda fixa (sem processamento): ${fixedIncomeUsersCount}`);
      console.log('💰 ==========================================');
      console.log('💰 RESET MENSAL DE ENTRADAS CONCLUÍDO');
      console.log('💰 ==========================================\n');

      return {
        success: true,
        message: `Reset mensal executado com sucesso`,
        usersProcessed: variableIncomeUsers.length,
        incomesArchived
      };
    } catch (error: any) {
      console.error('❌ Erro ao executar reset mensal de entradas:', error);
      return {
        success: false,
        message: `Erro: ${error.message}`,
        usersProcessed: 0,
        incomesArchived: 0
      };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Verifica se o reset deve ser executado hoje
   * Retorna true se for dia 1 do mês
   */
  shouldExecuteToday(): boolean {
    const now = new Date();
    return now.getDate() === 1;
  }

  /**
   * Agenda o próximo reset
   * Calcula quanto tempo falta até o dia 1 do próximo mês
   */
  getTimeUntilNextReset(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return nextMonth.getTime() - now.getTime();
  }

  /**
   * Inicia o scheduler de reset mensal usando node-cron
   * Executa automaticamente no dia 1 de cada mês às 00:00
   */
  startScheduler(): void {
    console.log('📅 Income Reset Scheduler iniciado');
    
    // Verificar se deve executar hoje (com await)
    if (this.shouldExecuteToday()) {
      console.log('📅 Hoje é dia 1! Executando reset...');
      this.executeMonthlyReset()
        .then(result => {
          if (result.success) {
            console.log('✅ Reset inicial executado com sucesso!');
          } else {
            console.error('❌ Falha no reset inicial:', result.message);
          }
        })
        .catch(err => {
          console.error('❌ Erro inesperado no reset inicial:', err);
        });
    }

    // Usar node-cron para agendar execução todo dia 1 às 00:00
    // Formato: minuto hora dia mês dia-da-semana
    // 0 0 1 * * = às 00:00 do dia 1 de todos os meses
    this.cronJob = cron.schedule('0 0 1 * *', async () => {
      console.log('📅 Executando reset mensal de entradas...');
      const result = await this.executeMonthlyReset();
      if (result.success) {
        console.log('✅ Reset mensal agendado executado com sucesso!');
      } else {
        console.error('❌ Falha no reset mensal agendado:', result.message);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });
    
    console.log('✅ Scheduler de reset mensal iniciado! Executará todo dia 1 às 00:00 (horário de Brasília).');
    
    // Calcular próxima execução para informação
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    nextResetDate.setDate(1);
    nextResetDate.setHours(0, 0, 0, 0);
    console.log(`⏰ Próxima execução: ${nextResetDate.toLocaleString('pt-BR')}`);
  }

  /**
   * Para o scheduler
   */
  stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Scheduler de reset mensal parado.');
    }
