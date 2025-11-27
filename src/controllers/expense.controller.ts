import { Response } from 'express';
import { ExpenseService } from '../services/expense.service';
import { AutoPendencyService } from '../services/auto-pendency.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class ExpenseController {
  private expenseService = new ExpenseService();
  private autoPendencyService = new AutoPendencyService();

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const expense = await this.expenseService.create({
        ...req.body,
        userId: req.userId
      });
      res.status(201).json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const expenses = await this.expenseService.findAll(req.userId);
      res.json(expenses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const expense = await this.expenseService.findById(req.params.id, req.userId!);
      if (!expense) {
        res.status(404).json({ error: 'Despesa não encontrada' });
        return;
      }
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const expense = await this.expenseService.update(
        req.params.id,
        req.userId!,
        req.body
      );
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await this.expenseService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async uploadReceipt(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
      }
      
      const receiptUrl = `/uploads/${req.file.filename}`;
      const expense = await this.expenseService.update(
        req.params.id,
        req.userId!,
        { receiptUrl }
      );
      
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async markAsPaid(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const paymentInfo = {
        paymentMethod: req.body.paymentMethod,
        paidAt: req.body.paidAt
      };
      
      const expense = await this.expenseService.markAsPaid(
        req.params.id,
        req.userId,
        paymentInfo
      );
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Busca apenas as despesas do mês atual (pendências)
   */
  async findCurrentMonth(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const expenses = await this.expenseService.findCurrentMonthExpenses(req.userId);
      res.json(expenses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Busca despesas recorrentes base (templates)
   */
  async findRecurring(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const expenses = await this.expenseService.findRecurringExpenses(req.userId);
      res.json(expenses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Cria uma despesa recorrente base
   */
  async createRecurring(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const expense = await this.expenseService.createRecurringExpense({
        ...req.body,
        userId: req.userId
      });
      res.status(201).json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Verifica e gera automaticamente pendências para o usuário atual
   * Este endpoint é chamado sempre que o usuário acessa ou atualiza a plataforma
   */
  async autoGeneratePendencies(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const result = await this.autoPendencyService.checkAndGeneratePendencies(req.userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Busca despesas por aba/filtro
   */
  async findByTab(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      
      const tab = req.params.tab as 'pending' | 'paid' | 'registered' | 'recurrent' | 'installment';
      const validTabs = ['pending', 'paid', 'registered', 'recurrent', 'installment'];
      
      if (!validTabs.includes(tab)) {
        res.status(400).json({ error: 'Aba inválida' });
        return;
      }
      
      const expenses = await this.expenseService.findByTab(req.userId, tab);
      res.json(expenses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
