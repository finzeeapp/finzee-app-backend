# Guia de Migração para Prisma + Supabase

## Pré-requisitos
1. Senha do banco Supabase configurada no `.env`

## Passos para Migração

### 1. Configurar variáveis de ambiente
Edite o arquivo `.env` e substitua `[YOUR-PASSWORD]` pela senha real do Supabase:

```env
DATABASE_URL="postgresql://postgres.slprlffvlgzepepvtlgv:SUA_SENHA_AQUI@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.slprlffvlgzepepvtlgv:SUA_SENHA_AQUI@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

### 2. Gerar o Prisma Client
```bash
npm run prisma:generate
```

### 3. Criar as tabelas no banco (migração inicial)
```bash
npm run prisma:migrate
```
Quando solicitado, dê um nome para a migração, por exemplo: `init`

### 4. (Opcional) Visualizar o banco de dados
```bash
npm run prisma:studio
```
Abre uma interface web em `http://localhost:5555` para visualizar e editar dados.

### 5. Testar localmente
```bash
npm run dev
```

### 6. Deploy no Railway
No Railway, adicione as variáveis de ambiente:
- `DATABASE_URL`: URL de conexão com pooling
- `DIRECT_URL`: URL de conexão direta

## Scripts Disponíveis

- `npm run prisma:generate` - Gera o Prisma Client
- `npm run prisma:migrate` - Cria e aplica migrações em desenvolvimento
- `npm run prisma:deploy` - Aplica migrações em produção
- `npm run prisma:studio` - Abre interface visual do banco
- `npm run build` - Compila TypeScript (inclui geração do Prisma Client)

## Estrutura do Banco

### Users
- Informações do usuário, perfil de investidor, metas

### Expenses  
- Despesas fixas, variáveis e parceladas
- Suporte a recorrência automática

### Investments
- Investimentos com tipos, valores e rentabilidade

### Notifications
- Notificações para o usuário

## Próximos Passos

Depois da migração, os services serão atualizados para usar Prisma ao invés do db.json.
