import { Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class DashboardController {
  private dashboardService = new DashboardService();

  async getMonthlyDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Usar o userId real do banco para testes
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const dashboard = await this.dashboardService.getMonthlyDashboard(userId);
      res.json(dashboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
