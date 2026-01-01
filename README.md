# 💰 Family Finance v2.0

Современное веб-приложение для учёта семейных финансов с ML-аналитикой.

[![Deploy to GitHub Pages](https://github.com/yourusername/family-finance/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/family-finance/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb?style=flat-square)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square)](https://supabase.com/)

## 🎮 Демо

**[▶️ Открыть демо](https://yourusername.github.io/family-finance/)**

> Демо-режим работает без базы данных — данные сгенерированы автоматически.

## 🚀 Быстрый старт

```bash
# Клонировать
git clone https://github.com/yourusername/family-finance.git
cd family-finance

# Установить
npm install

# Запустить (демо-режим)
echo "VITE_DEMO_MODE=true" > .env.local
npm run dev
```

📖 **[Полная инструкция по деплою →](./DEPLOYMENT.md)**

## ✨ Возможности

### 📊 ML-Аналитика
- **Прогнозирование расходов** — линейная регрессия с учётом сезонности
- **Обнаружение аномалий** — Z-score и IQR методы
- **Анализ трендов** — направление, волатильность, сравнение периодов

### 🏥 Финансовое здоровье
- **Скоринг 0-100** — оценка по 4 параметрам
- **Грейды A-F** — наглядная оценка состояния
- **Рекомендации** — персонализированные советы

### 🏷️ Автокатегоризация
- **Ключевые слова** — 200+ паттернов для русского языка
- **Машинное обучение** — обучение на истории транзакций
- **Кастомные правила** — собственные паттерны

### 👨‍👩‍👧‍👦 Семейный учёт
- **Разделение расходов** — автоматический расчёт долгов
- **Общие/личные траты** — флаг для каждой транзакции
- **Мультипользовательность** — несколько участников

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────────────┐  │
│  │Dashboard│ │Analytics │ │Transact.│ │Financial Health │  │
│  └────┬────┘ └────┬─────┘ └────┬────┘ └────────┬────────┘  │
│       └───────────┴────────────┴───────────────┘            │
│                           │                                  │
│                    ┌──────┴──────┐                          │
│                    │   Zustand   │  State Management        │
│                    └──────┬──────┘                          │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    SERVICES LAYER                            │
│  ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────────────────────┐│
│  │   ML   │ │ Anomaly │ │ Health │ │    AutoCategory      ││
│  │        │ │Detection│ │Scoring │ │                      ││
│  └───┬────┘ └────┬────┘ └───┬────┘ └──────────┬───────────┘│
│      └───────────┴──────────┴────────────────┬┘            │
│                           │                                  │
│                    ┌──────┴──────┐                          │
│                    │  Analytics  │  Main Service            │
│                    └──────┬──────┘                          │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                      SUPABASE                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │     Auth     │  │Edge Functions│      │
│  │   + RLS      │  │   (Google)   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Структура проекта

```
family-finance/
├── src/
│   ├── services/           # Бизнес-логика
│   │   ├── ml.ts           # Линейная регрессия, прогнозы
│   │   ├── anomaly.ts      # Обнаружение аномалий
│   │   ├── health.ts       # Финансовое здоровье
│   │   ├── autocategory.ts # Автокатегоризация
│   │   └── analytics.ts    # Главный сервис
│   │
│   ├── lib/
│   │   └── supabase.ts     # Клиент Supabase + helpers
│   │
│   └── types/
│       └── index.ts        # TypeScript типы
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── tests/
│   ├── services/
│   │   ├── ml.test.ts
│   │   ├── health.test.ts
│   │   ├── anomaly.test.ts
│   │   └── autocategory.test.ts
│   └── setup.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone https://github.com/yourusername/family-finance.git
cd family-finance
npm install
```

### 2. Настройка Supabase

```bash
# Установите Supabase CLI
npm install -g supabase

# Инициализируйте проект
supabase init

# Запустите локально (опционально)
supabase start

# Или используйте облако
# Создайте проект на https://supabase.com
```

### 3. Переменные окружения

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Применение миграций

```bash
supabase db push
```

### 5. Запуск

```bash
# Разработка
npm run dev

# Тесты
npm run test

# Сборка
npm run build
```

## 📊 ML-Сервисы

### Линейная регрессия

```typescript
import { ML } from '@/services/ml';

// Простая регрессия
const result = ML.linearRegression(
  [0, 1, 2, 3, 4],      // X values (месяцы)
  [1000, 1200, 1100, 1300, 1400]  // Y values (расходы)
);

console.log(result.slope);      // Наклон
console.log(result.intercept);  // Пересечение
console.log(result.r_squared);  // Коэффициент детерминации
console.log(result.prediction); // Прогноз на следующий период
```

### Прогнозирование

```typescript
// Прогноз расходов
const forecasts = ML.forecastExpenses([
  { date: new Date('2024-01'), amount: 50000 },
  { date: new Date('2024-02'), amount: 55000 },
  { date: new Date('2024-03'), amount: 52000 },
], 3); // 3 месяца вперёд

console.log(forecasts);
// [
//   { date: '2024-04', predicted: 54000, confidence_low: 48000, confidence_high: 60000 },
//   ...
// ]
```

### Обнаружение аномалий

```typescript
import { AnomalyService } from '@/services/anomaly';

const anomalies = AnomalyService.detectTransactionAnomalies(
  newTransaction,
  historicalTransactions,
  categories
);

// Типы аномалий:
// - high_amount: Необычно высокая сумма
// - unusual_category: Нетипичная категория
// - frequency: Слишком много транзакций
// - new_merchant: Новый продавец
```

### Финансовое здоровье

```typescript
import { HealthService } from '@/services/health';

const analysis = HealthService.analyzeFinancialHealth(
  transactions,
  budgets,
  goals
);

console.log(analysis.score);
// {
//   overall: 75,
//   savings: 80,
//   budget: 70,
//   debt: 90,
//   stability: 60,
//   grade: 'B',
//   emoji: '😊',
//   summary: 'Хорошее состояние финансов'
// }

console.log(analysis.recommendations);
// [
//   {
//     category: 'stability',
//     priority: 'medium',
//     title: 'Нестабильные расходы',
//     description: '...',
//     action: '...'
//   }
// ]
```

### Автокатегоризация

```typescript
import { AutoCategoryService } from '@/services/autocategory';

const prediction = AutoCategoryService.predictCategory(
  'Пятёрочка супермаркет',
  categories
);

console.log(prediction);
// {
//   category_id: 'cat-groceries',
//   category_name: 'Продукты',
//   confidence: 0.85
// }

// Обучение на истории
const patterns = AutoCategoryService.extractLearningPatterns(
  historicalTransactions
);
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
npm run test

# Запуск с покрытием
npm run test:coverage

# Запуск конкретного теста
npm run test -- ml.test.ts

# Watch mode
npm run test -- --watch
```

### Покрытие тестами

| Сервис | Покрытие |
|--------|----------|
| ML | 95% |
| Health | 90% |
| Anomaly | 85% |
| AutoCategory | 88% |

## 📱 PWA

Приложение поддерживает:
- ✅ Offline-режим (Service Worker)
- ✅ Установка на Home Screen
- ✅ Push-уведомления (Supabase Realtime)
- ✅ Background Sync

## 🔐 Безопасность

- **Row Level Security** — каждая семья видит только свои данные
- **Google OAuth** — безопасная аутентификация
- **API Keys** — только публичный ключ на клиенте

## 🗄️ База данных

### Основные таблицы

| Таблица | Описание |
|---------|----------|
| `profiles` | Профили пользователей |
| `families` | Семьи (группы пользователей) |
| `transactions` | Транзакции |
| `categories` | Категории |
| `budgets` | Бюджеты |
| `goals` | Финансовые цели |
| `anomalies` | Обнаруженные аномалии |
| `health_snapshots` | История скоринга |

### Миграции

```bash
# Создать новую миграцию
supabase migration new my_migration

# Применить миграции
supabase db push

# Откатить
supabase db reset
```

## 📈 Производительность

- **Code Splitting** — отдельные чанки для React, Chart.js, Supabase
- **Lazy Loading** — компоненты загружаются по требованию
- **Caching** — Supabase + Service Worker
- **Оптимизация запросов** — индексы на часто используемых полях

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing`)
5. Откройте Pull Request

## 📄 Лицензия

MIT © 2024

---

**Разработано с ❤️ для семейного бюджета**
