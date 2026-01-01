# 🚀 Инструкция по запуску Family Finance

## Содержание

1. [Быстрый старт (Demo)](#-быстрый-старт-demo)
2. [Деплой на GitHub Pages](#-деплой-на-github-pages)
3. [Полная установка с Supabase](#-полная-установка-с-supabase)
4. [Локальная разработка](#-локальная-разработка)
5. [Структура проекта](#-структура-проекта)
6. [Troubleshooting](#-troubleshooting)

---

## 🎮 Быстрый старт (Demo)

Самый быстрый способ запустить проект — демо-режим без базы данных:

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/YOUR_USERNAME/family-finance.git
cd family-finance

# 2. Установите зависимости
npm install

# 3. Создайте .env файл для демо-режима
echo "VITE_DEMO_MODE=true" > .env.local

# 4. Запустите
npm run dev
```

Откройте http://localhost:5173 — вы увидите приложение с демо-данными!

---

## 📦 Деплой на GitHub Pages

### Шаг 1: Форк/создание репозитория

```bash
# Если ещё не создали репозиторий:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/family-finance.git
git push -u origin main
```

### Шаг 2: Настройка GitHub Pages

1. Откройте репозиторий на GitHub
2. Перейдите в **Settings** → **Pages**
3. В разделе **Source** выберите **GitHub Actions**

### Шаг 3: Настройка секретов (опционально)

Если хотите использовать реальную базу данных:

1. **Settings** → **Secrets and variables** → **Actions**
2. Добавьте секреты:
   - `VITE_SUPABASE_URL` — URL вашего Supabase проекта
   - `VITE_SUPABASE_ANON_KEY` — публичный ключ Supabase

Для демо-режима добавьте:
- `VITE_DEMO_MODE` = `true`

### Шаг 4: Деплой

```bash
git push origin main
```

GitHub Actions автоматически:
1. ✅ Установит зависимости
2. ✅ Прогонит тесты
3. ✅ Соберёт проект
4. ✅ Задеплоит на GitHub Pages

**Ваш сайт будет доступен по адресу:**
```
https://YOUR_USERNAME.github.io/family-finance/
```

### Проверка деплоя

1. Перейдите во вкладку **Actions**
2. Дождитесь завершения workflow "Deploy to GitHub Pages"
3. Проверьте сайт!

---

## 🗄 Полная установка с Supabase

### Шаг 1: Создание проекта Supabase

1. Зарегистрируйтесь на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь инициализации (~2 минуты)

### Шаг 2: Применение миграций

```bash
# Установите Supabase CLI
npm install -g supabase

# Залогиньтесь
supabase login

# Свяжите с проектом
supabase link --project-ref YOUR_PROJECT_ID

# Примените миграции
supabase db push
```

Или вручную:
1. Откройте **SQL Editor** в Supabase Dashboard
2. Скопируйте содержимое `supabase/migrations/001_initial_schema.sql`
3. Выполните SQL

### Шаг 3: Получение ключей

1. **Settings** → **API**
2. Скопируйте:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### Шаг 4: Настройка аутентификации

1. **Authentication** → **Providers**
2. Включите **Email** (или Google, если нужно)
3. **URL Configuration** → добавьте:
   - Site URL: `https://YOUR_USERNAME.github.io/family-finance`
   - Redirect URLs: `https://YOUR_USERNAME.github.io/family-finance/auth/callback`

### Шаг 5: Создание .env.local

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_DEMO_MODE=false
```

---

## 💻 Локальная разработка

### Требования

- Node.js 18+
- npm 9+

### Команды

```bash
# Установка
npm install

# Разработка
npm run dev

# Тесты
npm run test        # Watch mode
npm run test:run    # Один раз
npm run test:coverage  # С покрытием

# Сборка
npm run build

# Превью сборки
npm run preview

# Проверка типов
npm run typecheck

# Линтинг
npm run lint
```

### Структура .env файлов

```
.env.example     # Шаблон (в git)
.env.local       # Локальные настройки (игнорируется git)
.env.production  # Для production сборки
```

---

## 📁 Структура проекта

```
family-finance/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions для деплоя
│
├── public/
│   ├── favicon.svg         # Иконка
│   └── manifest.json       # PWA манифест
│
├── src/
│   ├── services/           # Бизнес-логика
│   │   ├── ml.ts           # ML: регрессия, прогнозы
│   │   ├── anomaly.ts      # Обнаружение аномалий
│   │   ├── health.ts       # Финансовое здоровье
│   │   ├── autocategory.ts # Автокатегоризация
│   │   ├── analytics.ts    # Главный сервис
│   │   └── demo-data.ts    # Демо-данные
│   │
│   ├── lib/
│   │   └── supabase.ts     # Supabase клиент
│   │
│   ├── types/
│   │   └── index.ts        # TypeScript типы
│   │
│   ├── App.tsx             # Главный компонент
│   ├── main.tsx            # Точка входа
│   └── index.css           # Стили
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── tests/
│   └── services/           # Unit-тесты
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 🔧 Troubleshooting

### Проблема: 404 на GitHub Pages

**Решение:** Проверьте настройки в `vite.config.ts`:

```typescript
const base = process.env.GITHUB_ACTIONS ? '/family-finance/' : '/';
```

Имя репозитория должно совпадать с `base`.

### Проблема: Пустая страница

**Решение:** Откройте DevTools → Console, проверьте ошибки.

Частые причины:
- Неправильный `base` path
- Не загрузились ассеты
- Ошибка в JavaScript

### Проблема: Supabase не подключается

**Решение:**
1. Проверьте переменные окружения
2. Убедитесь, что RLS политики созданы
3. Проверьте CORS в Supabase Dashboard

### Проблема: Тесты падают

**Решение:**
```bash
# Очистите кэш
rm -rf node_modules/.vitest

# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install

# Запустите тесты
npm run test:run
```

### Проблема: Build падает

**Решение:**
```bash
# Проверьте типы
npm run typecheck

# Проверьте линтер
npm run lint
```

---

## 📱 PWA Установка

После деплоя пользователи могут установить приложение:

**iOS Safari:**
1. Откройте сайт
2. Нажмите "Поделиться" (⬆️)
3. "На экран Домой"

**Android Chrome:**
1. Откройте сайт
2. Меню (⋮) → "Установить приложение"

**Desktop Chrome:**
1. Откройте сайт
2. Иконка установки в адресной строке (➕)

---

## 🎯 Чеклист перед релизом

- [ ] Все тесты проходят (`npm run test:run`)
- [ ] Нет ошибок типов (`npm run typecheck`)
- [ ] Нет ошибок линтера (`npm run lint`)
- [ ] Сборка успешна (`npm run build`)
- [ ] Локальный превью работает (`npm run preview`)
- [ ] Секреты добавлены в GitHub
- [ ] GitHub Pages включён
- [ ] Первый деплой успешен

---

## 📞 Поддержка

- 🐛 Баги: [GitHub Issues](https://github.com/YOUR_USERNAME/family-finance/issues)
- 💬 Вопросы: [GitHub Discussions](https://github.com/YOUR_USERNAME/family-finance/discussions)

---

**Готово! 🎉 Ваше приложение задеплоено!**
