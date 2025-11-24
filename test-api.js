#!/usr/bin/env node

/**
 * Script de exemplo para testar a API de pendências automáticas
 * Demonstra como usar os endpoints criados
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testando API de Pendências Automáticas');
  console.log('=' .repeat(50));

  try {
    // 1. Verificar status do scheduler
    console.log('\n📊 1. Status do Scheduler:');
    try {
      const statusResponse = await axios.get(`${API_BASE}/scheduler/status`);
      console.log('   ✅ Status:', JSON.stringify(statusResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ Erro ao verificar status:', error.message);
    }

    // 2. Criar algumas despesas recorrentes de exemplo
    console.log('\n📝 2. Criando Despesas Recorrentes:');
    
    const recurringExpenses = [
      {
        title: 'Aluguel',
        amount: 1500,
        category: 'Moradia',
        type: 'fixed',
        dueDay: 5,
        notes: 'Aluguel mensal'
      },
      {
        title: 'Internet Fibra',
        amount: 120,
        category: 'Contas',
        type: 'recurrent',
        recurrenceDay: 10,
        notes: 'Conta de internet'
      },
      {
        title: 'Sofá 3 Lugares',
        amount: 1200,
        category: 'Casa',
        type: 'installment',
        totalInstallments: 12,
        recurrenceDay: 15,
        notes: 'Parcelamento em 12x'
      }
    ];

    for (const expense of recurringExpenses) {
      try {
        const response = await axios.post(`${API_BASE}/expenses/recurring`, expense);
        console.log(`   ✅ ${expense.title} - R$ ${expense.amount}`);
      } catch (error) {
        console.log(`   ❌ Erro ao criar ${expense.title}:`, error.response?.data || error.message);
      }
    }

    // 3. Listar despesas recorrentes criadas
    console.log('\n📋 3. Despesas Recorrentes Cadastradas:');
    try {
      const recurringResponse = await axios.get(`${API_BASE}/expenses/recurring`);
      const recurring = recurringResponse.data;
      
      if (recurring.length === 0) {
        console.log('   ⚠️  Nenhuma despesa recorrente encontrada');
      } else {
        recurring.forEach((expense, index) => {
          console.log(`   ${index + 1}. ${expense.title} - R$ ${expense.amount}`);
          console.log(`      📅 Dia: ${expense.dueDay}`);
          console.log(`      🏷️  Tipo: ${expense.type}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Erro ao listar recorrentes:', error.response?.data || error.message);
    }

    // 4. Executar geração de pendências
    console.log('\n🔄 4. Gerando Pendências do Mês Atual:');
    try {
      const generateResponse = await axios.post(`${API_BASE}/scheduler/generate-current-user`);
      const result = generateResponse.data;
      
      console.log(`   ✅ Sucesso: ${result.success}`);
      console.log(`   📝 Mensagem: ${result.message}`);
      console.log(`   🔢 Geradas: ${result.generated || 0}`);
    } catch (error) {
      console.log('   ❌ Erro ao gerar pendências:', error.response?.data || error.message);
    }

    // 5. Listar pendências do mês atual
    console.log('\n📅 5. Pendências do Mês Atual:');
    try {
      const currentMonthResponse = await axios.get(`${API_BASE}/expenses/current-month`);
      const currentExpenses = currentMonthResponse.data;
      
      if (currentExpenses.length === 0) {
        console.log('   ⚠️  Nenhuma pendência encontrada para o mês atual');
      } else {
        currentExpenses.forEach((expense, index) => {
          console.log(`   ${index + 1}. ${expense.title}`);
          console.log(`      💰 Valor: R$ ${expense.amount}`);
          console.log(`      📅 Vencimento: ${expense.dueDate}`);
          console.log(`      📆 Mês: ${expense.referenceMonth}`);
          console.log(`      🔄 Gerada: ${expense.isGenerated ? 'Sim' : 'Não'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('   ❌ Erro ao listar pendências:', error.response?.data || error.message);
    }

    // 6. Verificar todas as despesas
    console.log('\n🗂️  6. Todas as Despesas (para comparação):');
    try {
      const allExpensesResponse = await axios.get(`${API_BASE}/expenses`);
      const allExpenses = allExpensesResponse.data;
      
      console.log(`   📊 Total de despesas: ${allExpenses.length}`);
      
      const byType = allExpenses.reduce((acc, expense) => {
        const key = expense.isRecurring ? 'Templates Recorrentes' : 
                   expense.isGenerated ? 'Pendências Geradas' : 'Outras';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
      
    } catch (error) {
      console.log('   ❌ Erro ao listar todas as despesas:', error.response?.data || error.message);
    }

    console.log('\n✅ Teste concluído!');
    console.log('\n💡 Dicas:');
    console.log('   - As despesas recorrentes são templates que não aparecem nas pendências');
    console.log('   - As pendências são geradas automaticamente todo dia 1º do mês');
    console.log('   - Use POST /scheduler/generate-current-user para gerar manualmente');
    console.log('   - A aba "Pendentes" no frontend mostra apenas as do mês atual');

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar teste
if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = { testAPI };