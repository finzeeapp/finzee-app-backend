import { Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class DashboardController {
  private dashboardService = new DashboardService();

  async getMonthlyDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const dashboard = await this.dashboardService.getMonthlyDashboard(req.userId);
      res.json(dashboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
