import { Response } from 'express';
import { InvestmentService } from '../services/investment.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class InvestmentController {
  private investmentService = new InvestmentService();

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const investment = await this.investmentService.create({
        ...req.body,
        userId: req.userId
      });
      res.status(201).json(investment);
    } catch (error: any) {
      console.error('Erro ao criar investimento:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const investments = await this.investmentService.findAll(req.userId);
      res.json(investments);
    } catch (error: any) {
      console.error('Erro ao buscar investimentos:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async getSuggestions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const suggestions = await this.investmentService.getSuggestions(req.userId);
      res.json(suggestions);
    } catch (error: any) {
      console.error('Erro ao buscar sugestões:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      await this.investmentService.delete(req.params.id, req.userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao excluir investimento:', error);
      res.status(400).json({ error: error.message });
    }
  }
}
