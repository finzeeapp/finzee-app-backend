import { Response } from 'express';
import { InvestmentService } from '../services/investment.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class InvestmentController {
  private investmentService = new InvestmentService();

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const investment = await this.investmentService.create({
        ...req.body,
        userId
      });
      res.status(201).json(investment);
    } catch (error: any) {
      console.error('Erro ao criar investimento:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const investments = await this.investmentService.findAll(userId);
      res.json(investments);
    } catch (error: any) {
      console.error('Erro ao buscar investimentos:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async getSuggestions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const suggestions = await this.investmentService.getSuggestions(userId);
      res.json(suggestions);
    } catch (error: any) {
      console.error('Erro ao buscar sugestões:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      await this.investmentService.delete(req.params.id, userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao excluir investimento:', error);
      res.status(400).json({ error: error.message });
    }
  }
}
