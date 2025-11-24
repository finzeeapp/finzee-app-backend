#!/usr/bin/env node

/**
 * Script de teste para demonstrar a funcionalidade de criação automática de pendências mensais
 * Este script simula o comportamento do scheduler e mostra como as despesas são geradas
 */

const { DatabaseService } = require('./src/services/database.service');
const { SchedulerService } = require('./src/services/scheduler.service');

console.log('🧪 Teste da Funcionalidade de Pendências Automáticas');
console.log('=' .repeat(60));

async function runTest() {
  try {
    // 1. Simular criação de despesas recorrentes base
    console.log('\n📝 1. Criando despesas recorrentes base...');
    
    const db = DatabaseService.getInstance();
    const testUserId = 'test-user-123';
    
    // Criar usuário de teste se não existir
    const existingUser = db.getUsers().find(u => u.id === testUserId);
    if (!existingUser) {
      db.addUser({
        id: testUserId,
        email: 'test@finzee.com',
        name: 'Usuário Teste',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Usuário de teste criado');
    }

    // Criar algumas despesas recorrentes base
    const recurringExpenses = [
      {
        id: 'rent-base',
        userId: testUserId,
        title: 'Aluguel',
        amount: 1500,
        category: 'Moradia',
        type: 'fixed',
        dueDay: 5,
        status: 'TEMPLATE',
        isPaid: false,
        isRecurring: true,
        isGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'internet-base',
        userId: testUserId,
        title: 'Internet',
        amount: 120,
        category: 'Contas',
        type: 'fixed',
        dueDay: 10,
        status: 'TEMPLATE',
        isPaid: false,
        isRecurring: true,
        isGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'sofa-base',
        userId: testUserId,
        title: 'Sofá',
        amount: 1200,
        category: 'Casa',
        type: 'installment',
        dueDay: 15,
        totalInstallments: 12,
        status: 'TEMPLATE',
        isPaid: false,
        isRecurring: true,
        isGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Limpar despesas existentes do usuário de teste
    const allExpenses = db.getExpenses();
    const cleanedExpenses = allExpenses.filter(e => e.userId !== testUserId);
    db.saveExpenses(cleanedExpenses);

    // Adicionar despesas base
    recurringExpenses.forEach(expense => {
      db.addExpense(expense);
      console.log(`   ➕ ${expense.title} - R$ ${expense.amount} - Dia ${expense.dueDay}`);
    });

    console.log('\n🔄 2. Executando geração de pendências mensais...');
    
    // Instanciar o scheduler e executar manualmente
    const scheduler = new SchedulerService();
    const result = await scheduler.executeManually();
    
    console.log(`\n📊 3. Resultado da geração:`);
    console.log(`   ✅ Sucesso: ${result.success}`);
    console.log(`   📝 Mensagem: ${result.message}`);
    console.log(`   🔢 Pendências geradas: ${result.generated}`);

    // Mostrar as despesas geradas
    console.log('\n📋 4. Despesas geradas para o mês atual:');
    const currentExpenses = db.getExpenses().filter(e => 
      e.userId === testUserId && 
      e.isGenerated === true
    );

    if (currentExpenses.length === 0) {
      console.log('   ⚠️  Nenhuma despesa foi gerada');
    } else {
      currentExpenses.forEach((expense, index) => {
        console.log(`   ${index + 1}. ${expense.title}`);
        console.log(`      💰 Valor: R$ ${expense.amount}`);
        console.log(`      📅 Vencimento: ${expense.dueDate}`);
        console.log(`      📆 Referência: ${expense.referenceMonth}`);
        console.log(`      🏷️  Status: ${expense.status}`);
        console.log('');
      });
    }

    console.log('✅ Teste concluído com sucesso!');
    
    // Parar o scheduler
    scheduler.stopScheduler();

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar teste
runTest();