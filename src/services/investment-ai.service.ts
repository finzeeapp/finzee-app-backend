// Importar types localmente
interface User {
  id: string;
  email: string;
  name: string;
  monthlyIncome?: number;
  investmentProfile?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Expense {
  id: string;
  userId: string;
  amount: number;
  dueDate: Date;
}

interface Investment {
  id: string;
  userId: string;
  title: string;
  type: string;
}

enum InvestmentRiskProfile {
  CONSERVATIVE = 'CONSERVATIVE',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE'
}

interface InvestmentSuggestion {
  title: string;
  description: string;
  type: string;
  suggestedAmount: number;
  estimatedReturn: number;
  riskLevel: string;
  reason: string;
}

export class InvestmentAIService {
  /**
   * Gera sugestões de investimento baseadas no perfil do usuário,
   * despesas e investimentos existentes.
   * Este é um serviço mockado que simula IA. No futuro, pode ser
   * integrado com OpenAI ou outra API de IA.
   */
  generateSuggestions(
    user: User,
    expenses: Expense[],
    investments: Investment[]
  ): InvestmentSuggestion[] {
    const monthlyIncome = user.monthlyIncome || 0;
    const totalExpenses = this.calculateMonthlyExpenses(expenses);
    const availableAmount = monthlyIncome - totalExpenses;
    const profile = user.investmentProfile || InvestmentRiskProfile.MODERATE;

    if (availableAmount <= 0) {
      return [{
        title: 'Controle suas despesas primeiro',
        description: 'Antes de investir, é importante ter um saldo positivo no final do mês.',
        type: 'ADVICE',
        suggestedAmount: 0,
        estimatedReturn: 0,
        riskLevel: 'NONE',
        reason: 'Suas despesas estão iguais ou maiores que sua renda. Foque em reduzir custos.'
      }];
    }

    const suggestions: InvestmentSuggestion[] = [];
    const suggestedInvestmentAmount = availableAmount * 0.2; // 20% do disponível

    // Reserva de emergência
    if (!this.hasEmergencyFund(investments)) {
      suggestions.push({
        title: 'Fundo de Emergência',
        description: 'Reserve de 3 a 6 meses das suas despesas em investimentos líquidos e seguros.',
        type: 'SAVINGS',
        suggestedAmount: totalExpenses * 3,
        estimatedReturn: 100, // 100% do CDI
        riskLevel: 'CONSERVATIVE',
        reason: 'Essencial para imprevistos. Comece com um valor menor e vá acumulando.'
      });
    }

    // Sugestões baseadas no perfil
    if (profile === InvestmentRiskProfile.CONSERVATIVE) {
      suggestions.push({
        title: 'Tesouro Selic',
        description: 'Investimento de renda fixa com liquidez diária e baixo risco.',
        type: 'FIXED_INCOME',
        suggestedAmount: suggestedInvestmentAmount,
        estimatedReturn: 13.75, // Taxa Selic atual (exemplo)
        riskLevel: 'CONSERVATIVE',
        reason: 'Perfeito para perfil conservador. Rende mais que a poupança com baixo risco.'
      });

      suggestions.push({
        title: 'CDB com liquidez diária',
        description: 'Certificado de Depósito Bancário com garantia do FGC.',
        type: 'FIXED_INCOME',
        suggestedAmount: suggestedInvestmentAmount * 0.5,
        estimatedReturn: 110, // 110% do CDI
        riskLevel: 'CONSERVATIVE',
        reason: 'Diversifique sua carteira com CDBs que rendem mais que o Tesouro.'
      });
    }

    if (profile === InvestmentRiskProfile.MODERATE) {
      suggestions.push({
        title: 'Tesouro IPCA+',
        description: 'Protege seu dinheiro da inflação e oferece rentabilidade real.',
        type: 'FIXED_INCOME',
        suggestedAmount: suggestedInvestmentAmount * 0.6,
        estimatedReturn: 6.5, // IPCA + taxa fixa
        riskLevel: 'MODERATE',
        reason: 'Ideal para objetivos de médio/longo prazo com proteção contra inflação.'
      });

      suggestions.push({
        title: 'Fundos Imobiliários',
        description: 'Invista em imóveis sem precisar comprar um. Receba rendimentos mensais.',
        type: 'REAL_ESTATE',
        suggestedAmount: suggestedInvestmentAmount * 0.4,
        estimatedReturn: 8.0,
        riskLevel: 'MODERATE',
        reason: 'Diversificação com renda passiva. Comece com FIIs de papel (CRIs).'
      });
    }

    if (profile === InvestmentRiskProfile.AGGRESSIVE) {
      suggestions.push({
        title: 'Ações de empresas sólidas',
        description: 'Invista em ações de grandes empresas (blue chips) para crescimento no longo prazo.',
        type: 'STOCKS',
        suggestedAmount: suggestedInvestmentAmount * 0.5,
        estimatedReturn: 12.0,
        riskLevel: 'AGGRESSIVE',
        reason: 'Potencial de valorização acima da inflação. Requer paciência e visão de longo prazo.'
      });

      suggestions.push({
        title: 'ETFs diversificados',
        description: 'Fundos que replicam índices do mercado, como BOVA11 (Ibovespa).',
        type: 'STOCKS',
        suggestedAmount: suggestedInvestmentAmount * 0.3,
        estimatedReturn: 10.0,
        riskLevel: 'AGGRESSIVE',
        reason: 'Diversificação automática com menor custo que fundos tradicionais.'
      });

      suggestions.push({
        title: 'Criptomoedas (Bitcoin/Ethereum)',
        description: 'Ativos digitais com alto potencial mas também alto risco.',
        type: 'CRYPTO',
        suggestedAmount: suggestedInvestmentAmount * 0.2,
        estimatedReturn: 20.0,
        riskLevel: 'AGGRESSIVE',
        reason: 'Apenas se você tem alta tolerância a risco. Não invista mais de 5-10% do patrimônio.'
      });
    }

    return suggestions;
  }

  private calculateMonthlyExpenses(expenses: Expense[]): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses
      .filter(e => {
        const expenseDate = new Date(e.dueDate);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }

  private hasEmergencyFund(investments: Investment[]): boolean {
    return investments.some(i => 
      i.title.toLowerCase().includes('emergência') ||
      i.title.toLowerCase().includes('reserva')
    );
  }
}
