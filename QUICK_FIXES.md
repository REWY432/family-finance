# ⚡ Быстрые исправления - Пошаговое руководство

## 1. Создать ESLint конфигурацию (5 минут)

Создать файл `.eslintrc.cjs`:

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
  },
}
```

Запустить: `npm run lint`

---

## 2. Создать базовую структуру компонентов (30 минут)

Создать папки:
```bash
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/features
```

Создать `src/components/ui/Button.tsx`:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button 
      className={`button button-${variant}`} 
      {...props}
    >
      {children}
    </button>
  );
}
```

Создать `src/components/ui/Card.tsx`:
```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}
```

---

## 3. Создать Error Boundary (15 минут)

Создать `src/components/ErrorBoundary.tsx`:

```typescript
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Что-то пошло не так</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Использовать в `main.tsx`:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

## 4. Создать Zustand Store (30 минут)

Установить persist middleware:
```bash
npm install zustand
```

Создать `src/stores/financeStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser, AppTransaction, AppCategory } from '../lib/supabase';

interface FinanceState {
  // State
  users: AppUser[];
  transactions: AppTransaction[];
  categories: AppCategory[];
  loading: boolean;
  
  // Actions
  setUsers: (users: AppUser[]) => void;
  setTransactions: (transactions: AppTransaction[]) => void;
  addTransaction: (transaction: AppTransaction) => void;
  deleteTransaction: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      // Initial state
      users: [],
      transactions: [],
      categories: [],
      loading: false,
      
      // Actions
      setUsers: (users) => set({ users }),
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions],
      })),
      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      })),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'finance-storage',
      partialize: (state) => ({
        users: state.users,
        categories: state.categories,
        // Не сохраняем transactions в localStorage (слишком много данных)
      }),
    }
  )
);
```

Использовать в компонентах:
```typescript
import { useFinanceStore } from '../stores/financeStore';

function MyComponent() {
  const { users, transactions, addTransaction } = useFinanceStore();
  
  // ...
}
```

---

## 5. Добавить базовую валидацию (20 минут)

Установить zod:
```bash
npm install zod
```

Создать `src/utils/validators.ts`:

```typescript
import { z } from 'zod';

export const transactionSchema = z.object({
  user_id: z.string().min(1, 'Выберите пользователя'),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Сумма должна быть положительной'),
  category: z.string().min(1, 'Выберите категорию'),
  description: z.string().optional(),
  date: z.string().min(1, 'Выберите дату'),
  is_shared: z.boolean(),
  is_credit: z.boolean(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
```

Использовать в форме:
```typescript
import { transactionSchema } from '../utils/validators';

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  const result = transactionSchema.safeParse({
    user_id: userId,
    type,
    amount: parseFloat(amount),
    // ...
  });
  
  if (!result.success) {
    // Показать ошибки
    console.error(result.error.errors);
    return;
  }
  
  // Отправить данные
  onAdd(result.data);
};
```

---

## 6. Улучшить обработку ошибок (20 минут)

Создать `src/utils/errorHandler.ts`:

```typescript
export function handleSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    // Можно добавить более детальную обработку
    if (error.message.includes('duplicate')) {
      return 'Эта запись уже существует';
    }
    if (error.message.includes('network')) {
      return 'Ошибка сети. Проверьте подключение';
    }
    return error.message || 'Произошла ошибка';
  }
  return 'Неизвестная ошибка';
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: string) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = handleSupabaseError(error);
    console.error('Error:', message, error);
    if (onError) {
      onError(message);
    } else {
      alert(message); // Временное решение, лучше использовать toast
    }
    return null;
  }
}
```

Использовать:
```typescript
import { withErrorHandling } from '../utils/errorHandler';

const handleAddTransaction = async (data: TransactionInput) => {
  const result = await withErrorHandling(
    () => db.transactions.create(data),
    (error) => {
      // Показать ошибку пользователю
      alert(error);
    }
  );
  
  if (result) {
    setTransactions((prev) => [result, ...prev]);
  }
};
```

---

## Приоритетный порядок выполнения

1. ✅ ESLint (5 мин) - сразу улучшит качество кода
2. ✅ Error Boundary (15 мин) - защита от крашей
3. ✅ Обработка ошибок (20 мин) - лучший UX
4. ✅ Zustand Store (30 мин) - лучшее управление состоянием
5. ✅ Валидация (20 мин) - предотвращение ошибок
6. ✅ Структура компонентов (30 мин) - основа для рефакторинга

**Общее время: ~2 часа** для базовых улучшений

После этого можно переходить к полному рефакторингу компонентов.

