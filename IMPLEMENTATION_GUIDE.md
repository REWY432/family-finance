# 🛠️ Руководство по реализации топ-3 фич

## 1. 💰 Бюджеты - Техническая реализация

### Структура данных
```typescript
// Уже есть в types/index.ts
interface Budget {
  id: UUID;
  family_id: UUID;
  category_id?: UUID;
  name: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  alert_threshold: number; // 80 = уведомление при 80%
  start_date: string;
  end_date?: string;
  is_active: boolean;
}
```

### API функции (добавить в src/lib/supabase.ts)
```typescript
budgets: {
  list: async (): Promise<Budget[]> => {
    // Получить все бюджеты семьи
  },
  create: async (budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) => {
    // Создать бюджет
  },
  update: async (id: string, updates: Partial<Budget>) => {
    // Обновить бюджет
  },
  delete: async (id: string) => {
    // Удалить бюджет
  },
  getSpent: async (budgetId: string, period: DateRange) => {
    // Рассчитать потраченное за период
  }
}
```

### UI компоненты
```
src/components/budgets/
  ├── BudgetList.tsx          # Список бюджетов
  ├── BudgetCard.tsx          # Карточка с прогрессом
  ├── BudgetForm.tsx          # Форма создания/редактирования
  ├── BudgetProgress.tsx      # Прогресс-бар
  └── BudgetAlerts.tsx       # Уведомления о превышении
```

### Интеграция
- Использовать `HealthService` для расчёта бюджетов
- Показывать в DashboardTab
- Уведомления через Toast

---

## 2. 🎯 Финансовые цели - Техническая реализация

### Структура данных
```typescript
// Уже есть в types/index.ts
interface Goal {
  id: UUID;
  family_id: UUID;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  is_completed: boolean;
}

interface GoalContribution {
  id: UUID;
  goal_id: UUID;
  user_id: UUID;
  amount: number;
  note?: string;
}
```

### API функции
```typescript
goals: {
  list: async (): Promise<Goal[]> => {
    // Получить все цели
  },
  create: async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => {
    // Создать цель
  },
  addContribution: async (goalId: string, userId: string, amount: number) => {
    // Добавить взнос (триггер обновит current_amount)
  },
  complete: async (goalId: string) => {
    // Отметить как выполненную
  }
}
```

### UI компоненты
```
src/components/goals/
  ├── GoalList.tsx            # Список целей
  ├── GoalCard.tsx            # Карточка с прогрессом
  ├── GoalForm.tsx            # Форма создания
  ├── GoalProgress.tsx        # Круговой прогресс
  ├── ContributionForm.tsx    # Форма взноса
  └── GoalCelebration.tsx     # Анимация достижения
```

### Визуализация
- Круговой прогресс-бар (SVG)
- Процент выполнения
- Дни до дедлайна
- История взносов

---

## 3. 📊 Графики - Техническая реализация

### Установка (уже есть в package.json)
```json
{
  "chart.js": "^4.4.1",
  "react-chartjs-2": "^5.2.0"
}
```

### Настройка Chart.js
```typescript
// src/lib/chartConfig.ts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
```

### Типы графиков

#### 3.1 Линейный график расходов
```typescript
// src/components/charts/ExpenseLineChart.tsx
import { Line } from 'react-chartjs-2';

const data = {
  labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
  datasets: [{
    label: 'Расходы',
    data: monthlyExpenses,
    borderColor: 'rgb(255, 59, 48)',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    fill: true,
    tension: 0.4
  }]
};
```

#### 3.2 Столбчатый график доходов vs расходов
```typescript
// src/components/charts/IncomeExpenseBarChart.tsx
import { Bar } from 'react-chartjs-2';

const data = {
  labels: months,
  datasets: [
    {
      label: 'Доходы',
      data: incomeData,
      backgroundColor: 'rgba(52, 199, 89, 0.8)'
    },
    {
      label: 'Расходы',
      data: expenseData,
      backgroundColor: 'rgba(255, 59, 48, 0.8)'
    }
  ]
};
```

#### 3.3 Круговая диаграмма по категориям
```typescript
// src/components/charts/CategoryPieChart.tsx
import { Pie } from 'react-chartjs-2';

const data = {
  labels: categories.map(c => c.name),
  datasets: [{
    data: categoryAmounts,
    backgroundColor: categories.map(c => c.color)
  }]
};
```

### UI компоненты
```
src/components/charts/
  ├── ExpenseLineChart.tsx
  ├── IncomeExpenseBarChart.tsx
  ├── CategoryPieChart.tsx
  ├── HealthTrendChart.tsx
  └── ForecastChart.tsx
```

### Новая вкладка "Аналитика"
```typescript
// Добавить в App.tsx
{activeTab === 'analytics' && (
  <AnalyticsTab 
    transactions={transactions}
    users={users}
    categories={categories}
  />
)}
```

---

## 📋 Чек-лист реализации

### Бюджеты
- [ ] Создать API функции в supabase.ts
- [ ] Создать компоненты BudgetList, BudgetCard, BudgetForm
- [ ] Добавить вкладку "Бюджеты" или секцию в Dashboard
- [ ] Интегрировать с HealthService
- [ ] Добавить уведомления при превышении
- [ ] Добавить прогресс-бары

### Цели
- [ ] Создать API функции для goals
- [ ] Создать компоненты GoalList, GoalCard, GoalForm
- [ ] Реализовать круговой прогресс-бар
- [ ] Добавить форму взносов
- [ ] Добавить анимацию достижения
- [ ] Интегрировать в Dashboard

### Графики
- [ ] Настроить Chart.js
- [ ] Создать компоненты графиков
- [ ] Добавить вкладку "Аналитика"
- [ ] Добавить фильтры по периодам
- [ ] Добавить экспорт графиков
- [ ] Оптимизировать для мобильных

---

## 🎨 Примеры UI

### Бюджет карточка
```
┌─────────────────────────────┐
│ 🛒 Продукты                 │
│                             │
│ 45,000 ₽ / 50,000 ₽         │
│ ████████████░░░░ 90%        │
│                             │
│ ⚠️ Превышен на 5,000 ₽      │
└─────────────────────────────┘
```

### Цель карточка
```
┌─────────────────────────────┐
│ 🏖️ Отпуск на море          │
│                             │
│     ┌─────────┐             │
│     │   75%   │  (круг)     │
│     └─────────┘             │
│                             │
│ 150,000 ₽ / 200,000 ₽       │
│ Осталось: 50,000 ₽          │
│ До дедлайна: 45 дней        │
└─────────────────────────────┘
```

### График
```
┌─────────────────────────────┐
│ Расходы по месяцам          │
│                             │
│  60k ┤     ╭───╮            │
│  50k ┤  ╭──╯   ╰──╮         │
│  40k ┤─╯          ╰─        │
│      └────────────────      │
│      Янв Фев Мар Апр        │
└─────────────────────────────┘
```

---

## ⚡ Быстрый старт

### Шаг 1: Бюджеты (2-3 часа)
1. Добавить API функции
2. Создать BudgetCard компонент
3. Добавить в Dashboard
4. Добавить форму создания

### Шаг 2: Цели (2-3 часа)
1. Добавить API функции
2. Создать GoalCard с прогрессом
3. Добавить форму взноса
4. Интегрировать в Dashboard

### Шаг 3: Графики (3-4 часа)
1. Настроить Chart.js
2. Создать 3 базовых графика
3. Добавить вкладку "Аналитика"
4. Добавить фильтры

**Итого: 7-10 часов работы для топ-3 фич**

