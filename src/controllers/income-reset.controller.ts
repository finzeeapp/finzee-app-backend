import { Request, Response } from 'express';
import { IncomeResetService } from '../services/income-reset.service';

const incomeResetService = new IncomeResetService();

/**
 * Executa manualmente o reset mensal de entradas
 */
export const executeMonthlyReset = async (req: Request, res: Response) => {
  try {
    const result = await incomeResetService.executeMonthlyReset();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          usersProcessed: result.usersProcessed,
          incomesArchived: result.incomesArchived
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Erro ao executar reset mensal',
      error: error.message
    });
  }
};

/**
 * Retorna informações sobre o próximo reset
 */
export const getResetInfo = async (req: Request, res: Response) => {
  try {
    const shouldExecuteToday = incomeResetService.shouldExecuteToday();
    const timeUntilNextReset = incomeResetService.getTimeUntilNextReset();
    const nextResetDate = new Date(Date.now() + timeUntilNextReset);
    
    res.status(200).json({
      success: true,
      data: {
        shouldExecuteToday,
        nextResetDate: nextResetDate.toISOString(),
        timeUntilNextResetMs: timeUntilNextReset,
        timeUntilNextResetHours: Math.round(timeUntilNextReset / (1000 * 60 * 60))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações do reset',
      error: error.message
    });
  }
};
