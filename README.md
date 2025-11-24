# Finzee Backend

API REST para gestão financeira pessoal com IA para investimentos.

## 🚀 Tecnologias

- Node.js 18+
- TypeScript
- Express
- JWT Authentication
- LowDB (JSON database)
- Node-cron (scheduler)

## 📦 Instalação

```bash
npm install
```

## 🔧 Desenvolvimento

```bash
npm run dev
```

## 🏗️ Build

```bash
npm run build
```

## 🚀 Produção

```bash
npm start
```

## 📝 Variáveis de Ambiente

```env
PORT=3000
JWT_SECRET=seu_segredo_aqui
NODE_ENV=production
```

## 🔗 Deploy

Backend está deployado no Railway:
- URL: https://backend-production-fc7f.up.railway.app

## 📄 Endpoints

### Auth
- POST `/api/auth/register` - Registro de usuário
- POST `/api/auth/login` - Login
- GET `/api/auth/profile` - Perfil do usuário

### Expenses
- GET `/api/expenses` - Listar despesas
- POST `/api/expenses` - Criar despesa
- PUT `/api/expenses/:id` - Atualizar despesa
- DELETE `/api/expenses/:id` - Deletar despesa

### Investments
- GET `/api/investments` - Listar investimentos
- POST `/api/investments` - Criar investimento
- DELETE `/api/investments/:id` - Deletar investimento
- GET `/api/investments/suggestions` - Sugestões de IA

### Dashboard
- GET `/api/dashboard/summary` - Resumo financeiro

### Reports
- GET `/api/reports/monthly` - Relatório mensal
- GET `/api/reports/category` - Relatório por categoria
