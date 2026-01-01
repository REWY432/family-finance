-- ============================================
-- Family Finance - Simplified Schema (No Auth)
-- Run this AFTER 001_initial_schema.sql
-- ============================================

-- Disable RLS on tables for simple family use (no login required)
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS families DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anomalies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS health_snapshots DISABLE ROW LEVEL SECURITY;

-- Create simple app_config table for storing user names
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simple users table (no auth required)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT,
  color TEXT DEFAULT '#007AFF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simple transactions table
CREATE TABLE IF NOT EXISTS app_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_shared BOOLEAN DEFAULT FALSE,
  is_credit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create simple categories table
CREATE TABLE IF NOT EXISTS app_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#8E8E93',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO app_categories (name, type, icon, color) VALUES
  -- Expense categories
  ('Продукты', 'expense', '🛒', '#4CAF50'),
  ('Транспорт', 'expense', '🚗', '#2196F3'),
  ('Рестораны', 'expense', '🍽️', '#FF9800'),
  ('Развлечения', 'expense', '🎬', '#9C27B0'),
  ('Коммуналка', 'expense', '🏠', '#607D8B'),
  ('Здоровье', 'expense', '💊', '#E91E63'),
  ('Одежда', 'expense', '👕', '#00BCD4'),
  ('Подарки', 'expense', '🎁', '#F44336'),
  ('Образование', 'expense', '📚', '#3F51B5'),
  ('Путешествия', 'expense', '✈️', '#009688'),
  ('Дом', 'expense', '🏡', '#795548'),
  ('Связь', 'expense', '📱', '#673AB7'),
  ('Подписки', 'expense', '📺', '#FF5722'),
  ('Другое', 'expense', '📦', '#9E9E9E'),
  -- Income categories
  ('Зарплата', 'income', '💰', '#4CAF50'),
  ('Фриланс', 'income', '💻', '#2196F3'),
  ('Подарки', 'income', '🎁', '#E91E63'),
  ('Кэшбэк', 'income', '💳', '#FF9800'),
  ('Другое', 'income', '📦', '#9E9E9E')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_transactions_user ON app_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_transactions_date ON app_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_app_transactions_type ON app_transactions(type);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_config
DROP TRIGGER IF EXISTS app_config_updated_at ON app_config;
CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
