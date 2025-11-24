import { Request, Response } from 'express';
import { ReportsService } from '../services/reports.service';

export class ReportsController {
  private reportsService = new ReportsService();

  getMonthlyEvolution = async (req: Request, res: Response) => {
    try {
      // Usar userId default para testes se não houver autenticação
      const userId = (req as any).userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const months = parseInt(req.query.months as string) || 6;
      
      const data = await this.reportsService.getMonthlyEvolution(userId, months);
      return res.json(data);
    } catch (error: any) {
      console.error('Erro em getMonthlyEvolution:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  getExpensesByCategory = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const month = req.query.month as string;
      const year = req.query.year as string;
      
      const data = await this.reportsService.getExpensesByCategory(userId, month, year);
      return res.json(data);
    } catch (error: any) {
      console.error('Erro em getExpensesByCategory:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  getExpensesByType = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const month = req.query.month as string;
      const year = req.query.year as string;
      
      const data = await this.reportsService.getExpensesByType(userId, month, year);
      return res.json(data);
    } catch (error: any) {
      console.error('Erro em getExpensesByType:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  getIncomeVsExpenses = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const month = req.query.month as string;
      
      const data = await this.reportsService.getIncomeVsExpenses(userId, month);
      return res.json(data);
    } catch (error: any) {
      console.error('Erro em getIncomeVsExpenses:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  getInvestmentsSummary = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      
      const data = await this.reportsService.getInvestmentsSummary(userId);
      return res.json(data);
    } catch (error: any) {
      console.error('Erro em getInvestmentsSummary:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  getFullReport = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const month = req.query.month as string;
      
      const data = await this.reportsService.getFullReport(userId, month);
      return res.json(data);
    } catch (error: any) {
      console.error('Erro em getFullReport:', error);
      return res.status(500).json({ error: error.message });
    }
  };
}
