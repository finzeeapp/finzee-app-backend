import { Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AutoPendencyService } from '../services/auto-pendency.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class DashboardController {
  private dashboardService = new DashboardService();
  private autoPendencyService = new AutoPendencyService();

  async getMonthlyDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      // Verificar e gerar pendências automaticamente
      await this.autoPendencyService.checkAndGeneratePendencies(req.userId);

      const dashboard = await this.dashboardService.getMonthlyDashboard(req.userId);
      res.json(dashboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
