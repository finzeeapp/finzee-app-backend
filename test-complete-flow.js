#!/usr/bin/env node

/**
 * Script de teste completo para verificar a geração de pendências mensais
 * Simula a mudança de mês e testa todo o fluxo
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteFlow() {
  console.log('🧪 Teste Completo do Sistema de Pendências');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar se há despesas recorrentes
    console.log('\n📊 1. Verificando Informações de Debug:');
    try {
      const debugResponse = await axios.get(`${API_BASE}/scheduler/debug`);
      const debug = debugResponse.data;
      
      console.log(`   📅 Mês atual: ${debug.currentMonth}`);
      console.log(`   📝 Total de despesas: ${debug.totalExpenses}`);
      console.log(`   🔄 Templates recorrentes: ${debug.recurringTemplates.count}`);
      
      if (debug.recurringTemplates.count > 0) {
        debug.recurringTemplates.expenses.forEach((expense, index) => {
          console.log(`      ${index + 1}. ${expense.title} - R$ ${expense.amount} (${expense.type})`);
        });
      } else {
        console.log('   ⚠️  Nenhuma despesa recorrente encontrada!');
        console.log('   💡 Criando algumas despesas recorrentes de exemplo...');
        await createSampleRecurringExpenses();
      }
      
      console.log(`   ✅ Geradas neste mês: ${debug.generatedThisMonth.count}`);
      if (debug.generatedThisMonth.count > 0) {
        debug.generatedThisMonth.expenses.forEach((expense, index) => {
          console.log(`      ${index + 1}. ${expense.title} - R$ ${expense.amount} (${expense.dueDate})`);
        });
      }
      
    } catch (error) {
      console.log('   ❌ Erro ao verificar debug:', error.response?.data || error.message);
    }

    // 2. Limpar pendências do mês atual (para teste)
    console.log('\n🧹 2. Limpando Pendências do Mês Atual:');
    try {
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      const clearResponse = await axios.delete(`${API_BASE}/scheduler/clear/${currentMonth}`);
      const clearResult = clearResponse.data;
      
      console.log(`   ✅ ${clearResult.message}`);
      console.log(`   🗑️  Removidas: ${clearResult.removedCount || 0}`);
    } catch (error) {
      console.log('   ❌ Erro ao limpar:', error.response?.data || error.message);
    }

    // 3. Executar geração manual
    console.log('\n🔄 3. Executando Geração Manual:');
    try {
      const generateResponse = await axios.post(`${API_BASE}/scheduler/generate-current-user`);
      const result = generateResponse.data;
      
      console.log(`   ✅ Sucesso: ${result.success}`);
      console.log(`   📝 Mensagem: ${result.message}`);
      console.log(`   🔢 Geradas: ${result.generated || 0}`);
      
      if (result.generated === 0) {
        console.log('   ⚠️  Nenhuma pendência foi gerada!');
        console.log('   💡 Possíveis causas:');
        console.log('      - Não há despesas recorrentes cadastradas');
        console.log('      - Já foram geradas para este mês');
        console.log('      - Erro na lógica de geração');
      }
    } catch (error) {
      console.log('   ❌ Erro ao gerar:', error.response?.data || error.message);
    }

    // 4. Verificar resultado final
    console.log('\n📋 4. Verificando Resultado Final:');
    try {
      const finalDebugResponse = await axios.get(`${API_BASE}/scheduler/debug`);
      const finalDebug = finalDebugResponse.data;
      
      console.log(`   📅 Mês: ${finalDebug.currentMonth}`);
      console.log(`   🔄 Templates: ${finalDebug.recurringTemplates.count}`);
      console.log(`   ✅ Geradas: ${finalDebug.generatedThisMonth.count}`);
      
      if (finalDebug.generatedThisMonth.count > 0) {
        console.log('   📝 Pendências geradas:');
        finalDebug.generatedThisMonth.expenses.forEach((expense, index) => {
          console.log(`      ${index + 1}. ${expense.title} - R$ ${expense.amount}`);
          console.log(`         📅 Vence: ${expense.dueDate}`);
          console.log(`         🔗 Parent: ${expense.parentExpenseId}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Erro na verificação final:', error.response?.data || error.message);
    }

    // 5. Testar endpoint de pendências do mês atual
    console.log('\n📅 5. Testando Endpoint de Pendências do Mês:');
    try {
      const currentMonthResponse = await axios.get(`${API_BASE}/expenses/current-month`);
      const currentExpenses = currentMonthResponse.data;
      
      console.log(`   📊 Pendências encontradas: ${currentExpenses.length}`);
      
      currentExpenses.forEach((expense, index) => {
        console.log(`   ${index + 1}. ${expense.title}`);
        console.log(`      💰 Valor: R$ ${expense.amount}`);
        console.log(`      📅 Vencimento: ${expense.dueDate}`);
        console.log(`      📆 Referência: ${expense.referenceMonth}`);
        console.log(`      🔄 Gerada: ${expense.isGenerated ? 'Sim' : 'Não'}`);
        console.log('');
      });
    } catch (error) {
      console.log('   ❌ Erro ao buscar pendências:', error.response?.data || error.message);
    }

    console.log('\n✅ Teste Completo Finalizado!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

async function createSampleRecurringExpenses() {
  const sampleExpenses = [
    {
      title: 'Aluguel',
      amount: 1500,
      category: 'Moradia',
      type: 'fixed',
      dueDay: 5,
      notes: 'Aluguel mensal - teste automático'
    },
    {
      title: 'Internet',
      amount: 120,
      category: 'Contas',
      type: 'recurrent',
      recurrenceDay: 10,
      notes: 'Internet - teste automático'
    },
    {
      title: 'Sofá Parcelado',
      amount: 1200,
      category: 'Casa',
      type: 'installment',
      totalInstallments: 6,
      recurrenceDay: 15,
      notes: 'Sofá parcelado - teste automático'
    }
  ];

  for (const expense of sampleExpenses) {
    try {
      await axios.post(`${API_BASE}/expenses/recurring`, expense);
      console.log(`   ✅ Criada: ${expense.title}`);
    } catch (error) {
      console.log(`   ❌ Erro ao criar ${expense.title}:`, error.response?.data || error.message);
    }
  }
}

// Executar teste
if (require.main === module) {
  testCompleteFlow().catch(console.error);
}

module.exports = { testCompleteFlow };