import { prisma } from './prisma.service';
import { InvestmentAIService } from './investment-ai.service';

export class InvestmentService {
  private aiService = new InvestmentAIService();

  async create(data: any): Promise<any> {
    const investment = await prisma.investment.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type || 'outros',
        institution: data.institution || '',
        amount: data.investedAmount || 0,
        currentValue: data.currentAmount || data.investedAmount || 0,
        investmentDate: new Date(data.investmentDate),
        maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
        yieldRate: parseFloat(data.returnRate) || 0,
        notes: data.notes || ''
      }
    });
    
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
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { investmentDate: 'desc' }
    });
    
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
    const investment = await prisma.investment.findFirst({
      where: { id, userId }
    });

    if (!investment) {
      throw new Error('Investimento não encontrado');
    }

    await prisma.investment.delete({
      where: { id }
    });
  }

  async getSuggestions(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        monthlyIncome: true,
        monthlyInvestmentCapacity: true,
        investorProfile: true
      }
    });

    const expenses = await prisma.expense.findMany({
      where: { userId }
    });

    const investments = await prisma.investment.findMany({
      where: { userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return this.aiService.generateSuggestions(user as any, expenses as any, investments as any);
  }
}
