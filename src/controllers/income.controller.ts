import { Response } from 'express';
import { IncomeService } from '../services/income.service';
import { AuthRequest } from '../middleware/auth.middleware';

const incomeService = new IncomeService();

export class IncomeController {
  /**
   * POST /api/incomes - Criar novo lançamento de renda
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { description, amount, category, date, notes } = req.body;

      if (!description || !amount || !date) {
        return res.status(400).json({
          error: 'Campos obrigatórios: description, amount, date'
        });
      }

      const income = await incomeService.create(userId, {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        notes
      });

      res.status(201).json(income);
    } catch (error: any) {
      console.error('Erro ao criar renda:', error);
      res.status(500).json({ error: 'Erro ao criar lançamento de renda' });
    }
  }

  /**
   * GET /api/incomes - Listar rendas do usuário
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { startDate, endDate, category, limit } = req.query;

      const options: any = {};
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      if (category) options.category = category as string;
      if (limit) options.limit = parseInt(limit as string);

      const incomes = await incomeService.list(userId, options);

      res.json(incomes);
    } catch (error: any) {
      console.error('Erro ao listar rendas:', error);
      res.status(500).json({ error: 'Erro ao listar rendas' });
    }
  }

  /**
   * GET /api/incomes/stats - Estatísticas de renda
   */
  async getStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { year, month } = req.query;

      const stats = await incomeService.getStats(
        userId,
        year ? parseInt(year as string) : undefined,
        month ? parseInt(month as string) : undefined
      );

      res.json(stats);
    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas de renda' });
    }
  }

  /**
   * GET /api/incomes/:id - Buscar renda por ID
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      const income = await incomeService.getById(id, userId);

      if (!income) {
        return res.status(404).json({ error: 'Renda não encontrada' });
      }

      res.json(income);
    } catch (error: any) {
      console.error('Erro ao buscar renda:', error);
      res.status(500).json({ error: 'Erro ao buscar renda' });
    }
  }

  /**
   * PUT /api/incomes/:id - Atualizar renda
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      const { description, amount, category, date, notes } = req.body;

      const updateData: any = {};
      if (description !== undefined) updateData.description = description;
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (category !== undefined) updateData.category = category;
      if (date !== undefined) updateData.date = new Date(date);
      if (notes !== undefined) updateData.notes = notes;

      const result = await incomeService.update(id, userId, updateData);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Renda não encontrada' });
      }

      res.json({ message: 'Renda atualizada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao atualizar renda:', error);
      res.status(500).json({ error: 'Erro ao atualizar renda' });
    }
  }

  /**
   * DELETE /api/incomes/:id - Deletar renda
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      const result = await incomeService.delete(id, userId);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Renda não encontrada' });
      }

      res.json({ message: 'Renda deletada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao deletar renda:', error);
      res.status(500).json({ error: 'Erro ao deletar renda' });
    }
  }

  /**
   * GET /api/incomes/current-month/total - Total do mês atual
   */
  async getCurrentMonthTotal(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const total = await incomeService.getRealIncomeThisMonth(userId);

      res.json({ total });
    } catch (error: any) {
      console.error('Erro ao calcular total do mês:', error);
      res.status(500).json({ error: 'Erro ao calcular total do mês' });
    }
  }
}
