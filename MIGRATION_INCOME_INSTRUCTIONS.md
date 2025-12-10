# INSTRUÇÕES PARA APLICAR A MIGRATION NO SUPABASE

## 1. Acesse o Supabase SQL Editor

1. Acesse https://supabase.com
2. Entre no projeto Finzee
3. Vá em "SQL Editor" no menu lateral

## 2. Execute o SQL abaixo

```sql
-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('FIXED', 'VARIABLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "incomeType" "IncomeType" DEFAULT 'FIXED',
ADD COLUMN "estimatedMonthlyIncome" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incomes_userId_idx" ON "incomes"("userId");

-- CreateIndex
CREATE INDEX "incomes_date_idx" ON "incomes"("date");

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## 3. Após executar, push o código para o Railway

O código já está pronto. Basta fazer:
```bash
cd c:\finzee\finzee-backend
git add .
git commit -m "feat: Sistema de gestão de renda variável - adiciona Income management"
git push origin main
```

## 4. O que foi implementado:

### Backend:
- ✅ Schema Prisma com tabela Income e enum IncomeType
- ✅ Campos incomeType, estimatedMonthlyIncome no User
- ✅ IncomeService - CRUD completo de lançamentos de renda
- ✅ IncomeController - Endpoints REST
- ✅ IncomeRoutes - Rotas /api/incomes
- ✅ Dashboard atualizado com renda real e estimada
- ✅ Auth atualizado para aceitar incomeType no registro

### Endpoints disponíveis:
- POST /api/incomes - Criar lançamento de renda
- GET /api/incomes - Listar rendas (com filtros)
- GET /api/incomes/stats - Estatísticas de renda
- GET /api/incomes/current-month/total - Total do mês
- GET /api/incomes/:id - Buscar por ID
- PUT /api/incomes/:id - Atualizar renda
- DELETE /api/incomes/:id - Deletar renda

### Dashboard agora retorna:
- incomeType: "FIXED" ou "VARIABLE"
- monthlyIncome: renda fixa ou estimada
- realIncomeThisMonth: renda real acumulada (VARIABLE)
- averageMonthlyIncome: média dos últimos 6 meses (VARIABLE)
