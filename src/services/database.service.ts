import fs from 'fs';
import path from 'path';

// Importar types localmente - versão simplificada para o banco
interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  monthlyIncome?: number;
  monthlyInvestmentCapacity?: number;
  investorProfile?: 'conservador' | 'moderado' | 'arrojado';
  notificationDaysBefore?: number;
  savingsGoal?: number;
  savingsGoalDeadline?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Expense {
  id: string;
  userId: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  type: string;
  dueDate: Date | string;
  dueDay?: number;
  status: string;
  isPaid: boolean;
  paymentDate?: Date | string;
  receiptUrl?: string;
  installments?: number;
  currentInstallment?: number;
  totalInstallments?: number;
  referenceMonth?: string;
  isRecurring?: boolean; // Marca se é uma despesa recorrente (base)
  isGenerated?: boolean; // Marca se foi gerada automaticamente
  parentExpenseId?: string; // ID da despesa base para despesas geradas
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Investment {
  id: string;
  userId: string;
  name: string;
  type: 'renda_fixa' | 'acoes' | 'fundos_imobiliarios' | 'criptomoedas' | 'previdencia' | 'tesouro_direto' | 'cdb' | 'lci_lca' | 'outros';
  institution: string;
  amount: number;
  currentValue?: number;
  investmentDate: Date | string;
  maturityDate?: Date | string;
  yieldRate?: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedEntityId?: string;
  createdAt: Date;
}

interface Database {
  users: User[];
  expenses: Expense[];
  investments: Investment[];
  notifications: Notification[];
}

export class DatabaseService {
  private static instance: DatabaseService;
  private dbPath: string;
  private data: Database;

  private constructor() {
    this.dbPath = path.join(__dirname, '../../data/db.json');
    this.ensureDataDirectory();
    this.data = this.loadData();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.dbPath)) {
      const initialData: Database = {
        users: [],
        expenses: [],
        investments: [],
        notifications: []
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(initialData, null, 2));
    }
  }

  private loadData(): Database {
    try {
      const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      return {
        users: [],
        expenses: [],
        investments: [],
        notifications: []
      };
    }
  }

  private saveData(): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  public save(): void {
    this.saveData();
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  addUser(user: User): void {
    this.data.users.push(user);
    this.saveData();
  }

  // Expenses
  getExpenses(): Expense[] {
    return this.data.expenses;
  }

  addExpense(expense: Expense): void {
    this.data.expenses.push(expense);
    this.saveData();
  }

  saveExpenses(expenses: Expense[]): void {
    this.data.expenses = expenses;
    this.saveData();
  }

  deleteExpense(id: string): void {
    this.data.expenses = this.data.expenses.filter(e => e.id !== id);
    this.saveData();
  }

  // Investments
  getInvestments(): Investment[] {
    return this.data.investments;
  }

  addInvestment(investment: Investment): void {
    this.data.investments.push(investment);
    this.saveData();
  }

  saveInvestments(investments: Investment[]): void {
    this.data.investments = investments;
    this.saveData();
  }

  // Notifications
  getNotifications(): Notification[] {
    return this.data.notifications;
  }

  addNotification(notification: Notification): void {
    this.data.notifications.push(notification);
    this.saveData();
  }

  saveNotifications(notifications: Notification[]): void {
    this.data.notifications = notifications;
    this.saveData();
  }
}
