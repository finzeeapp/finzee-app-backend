import { DatabaseService } from './database.service';
import { InvestmentAIService } from './investment-ai.service';
import { v4 as uuidv4 } from 'uuid';

export class InvestmentService {
  private db = DatabaseService.getInstance();
  private aiService = new InvestmentAIService();

  async create(data: any): Promise<any> {
    const investment = {
      id: uuidv4(),
      userId: data.userId,
      name: data.name,
      type: data.type || 'outros',
      institution: data.institution || '',
      amount: data.investedAmount || 0,
      currentValue: data.currentAmount || data.investedAmount || 0,
      investmentDate: data.investmentDate,
      maturityDate: data.maturityDate || undefined,
      yieldRate: parseFloat(data.returnRate) || 0,
      notes: data.notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.db.addInvestment(investment);
    
    // Retornar no formato esperado pelo frontend
    return {
      id: investment.id,
      userId: investment.userId,
      name: investment.name,
      type: investment.type,
      institution: investment.institution,
      investedAmount: investment.amount,
      currentAmount: investment.currentValue,
      returnRate: String(investment.yieldRate),
      investmentDate: investment.investmentDate,
      maturityDate: investment.maturityDate,
      notes: investment.notes,
      createdAt: investment.createdAt,
      updatedAt: investment.updatedAt
    };
  }

  async findAll(userId: string): Promise<any[]> {
    const investments = this.db.getInvestments().filter(i => i.userId === userId);
    
    // Converter para o formato esperado pelo frontend
    return investments.map(inv => ({
      id: inv.id,
      userId: inv.userId,
      name: inv.name,
      type: inv.type,
      institution: inv.institution,
      investedAmount: inv.amount,
      currentAmount: inv.currentValue || inv.amount,
      returnRate: String(inv.yieldRate || 0),
      investmentDate: inv.investmentDate,
      maturityDate: inv.maturityDate,
      notes: inv.notes,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt
    }));
  }

  async delete(id: string, userId: string): Promise<void> {
    const investments = this.db.getInvestments();
    const filtered = investments.filter(i => !(i.id === id && i.userId === userId));

    if (filtered.length === investments.length) {
      throw new Error('Investimento não encontrado');
    }

    this.db.saveInvestments(filtered);
  }

  async getSuggestions(userId: string): Promise<any[]> {
    const user = this.db.getUsers().find(u => u.id === userId);
    const expenses = this.db.getExpenses().filter(e => e.userId === userId);
    const investments = this.db.getInvestments().filter(i => i.userId === userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return this.aiService.generateSuggestions(user as any, expenses as any, investments as any);
  }
}
