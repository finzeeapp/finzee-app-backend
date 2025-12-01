/**
 * Script para aplicar migration manualmente no Supabase
 * Execute: node migrate-manual.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function runMigration() {
  console.log('🚀 Iniciando migration...');
  
  try {
    // 1. Adicionar campos na tabela users
    console.log('📝 Adicionando campos em users...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS "lastNotificationSent" TIMESTAMP(3);
    `);
    console.log('✅ Campos adicionados em users');

    // 2. Verificar e criar notificationDaysBefore se não existir
    console.log('📝 Verificando notificationDaysBefore...');
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='users' AND column_name='notificationDaysBefore'
          ) THEN
              ALTER TABLE "users" ADD COLUMN "notificationDaysBefore" INTEGER DEFAULT 3;
          END IF;
      END $$;
    `);
    console.log('✅ notificationDaysBefore verificado');

    // 3. Criar tabela notification_logs
    console.log('📝 Criando tabela notification_logs...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notification_logs" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "overdueCount" INTEGER NOT NULL,
          "dueSoonCount" INTEGER NOT NULL,
          "urgencyLevel" TEXT NOT NULL,
          "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Tabela notification_logs criada');

    // 4. Criar índices
    console.log('📝 Criando índices...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_userId_idx" ON "notification_logs"("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");
    `);
    console.log('✅ Índices criados');

    // 5. Adicionar foreign key
    console.log('📝 Adicionando foreign key...');
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'notification_logs_userId_fkey'
          ) THEN
              ALTER TABLE "notification_logs" 
              ADD CONSTRAINT "notification_logs_userId_fkey" 
              FOREIGN KEY ("userId") REFERENCES "users"("id") 
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
      END $$;
    `);
    console.log('✅ Foreign key adicionada');

    // 6. Verificar resultado
    console.log('🔍 Verificando migration...');
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "users"`;
    console.log(`✅ Total de usuários: ${userCount[0].count}`);

    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' 
        AND column_name IN ('emailNotificationsEnabled', 'lastNotificationSent', 'notificationDaysBefore')
      ORDER BY column_name;
    `;
    
    console.log('\n✅ Colunas criadas:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
    });

    console.log('\n🎉 Migration concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Adicione as variáveis GMAIL_USER e GMAIL_APP_PASSWORD no .env');
    console.log('   2. Execute: npm run dev');
    console.log('   3. Teste: POST /api/notifications/test-email\n');

  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
runMigration()
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
