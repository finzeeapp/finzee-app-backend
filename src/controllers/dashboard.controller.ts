import { Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AutoPendencyService } from '../services/auto-pendency.service';
import { ExpenseService } from '../services/expense.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class DashboardController {
  private dashboardService = new DashboardService();
  private autoPendencyService = new AutoPendencyService();
  private expenseService = new ExpenseService();

  async getMonthlyDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      // Limpar despesas parceladas que já foram completamente pagas
      await this.expenseService.cleanupCompletedInstallments(req.userId);

      // Verificar e gerar pendências automaticamente
      await this.autoPendencyService.checkAndGeneratePendencies(req.userId);

      const dashboard = await this.dashboardService.getMonthlyDashboard(req.userId);
      res.json(dashboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
