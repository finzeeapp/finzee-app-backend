import { Request, Response } from 'express';
import { SchedulerService } from '../services/scheduler-simple.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class SchedulerController {
  private schedulerService = new SchedulerService();

  /**
   * Executa manualmente a geração de pendências mensais
   */
  async executeScheduler(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.schedulerService.executeManually();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Erro interno: ${error.message}`,
        generated: 0 
      });
    }
  }

  /**
   * Retorna o status do scheduler
   */
  async getSchedulerStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const status = this.schedulerService.getSchedulerStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ 
        error: `Erro ao obter status do scheduler: ${error.message}` 
      });
    }
  }

  /**
   * Remove despesas geradas de um mês específico (para debug/testes)
   */
  async clearGeneratedExpenses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { month } = req.params;
      const userId = req.userId;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        res.status(400).json({ 
          error: 'Formato de mês inválido. Use YYYY-MM' 
        });
        return;
      }

      const removedCount = await this.schedulerService.clearGeneratedExpensesForMonth(
        month, 
        userId
      );

      res.json({
        success: true,
        message: `${removedCount} despesas geradas removidas do mês ${month}`,
        removedCount
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: `Erro ao limpar despesas geradas: ${error.message}` 
      });
    }
  }

  /**
   * Gera pendências para um usuário específico no mês atual
   */
  async generateForCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      
      console.log('🌐 ==========================================');
      console.log('🌐 API CHAMADA: /generate-current-user');
      console.log('🌐 Usuário ID:', userId);
      console.log('🌐 ==========================================');
      
      if (!userId) {
        console.log('❌ Usuário não autenticado!');
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      // Para esta funcionalidade, vamos executar apenas para o usuário atual
      console.log('⚙️  Executando geração manual...');
      const result = await this.schedulerService.executeManually();
      
      console.log('📊 ==========================================');
      console.log('📊 RESULTADO DA GERAÇÃO:');
      console.log('📊 Success:', result.success);
      console.log('📊 Generated:', result.generated);
      console.log('📊 Message:', result.message);
      console.log('📊 ==========================================');
      
      res.json({
        success: true,
        message: 'Pendências geradas para o usuário atual',
        generated: result.generated
      });
    } catch (error: any) {
      console.error('❌ Erro ao gerar pendências:', error);
      res.status(500).json({ 
        error: `Erro ao gerar pendências: ${error.message}` 
      });
    }
  }

  /**
   * Retorna informações de debug sobre despesas recorrentes e geradas
   */
  async getDebugInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const debugInfo = await this.schedulerService.getDebugInfo(userId);
      res.json(debugInfo);
    } catch (error: any) {
      res.status(500).json({ 
        error: `Erro ao obter informações de debug: ${error.message}` 
      });
    }
  }
}
