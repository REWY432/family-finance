-- ============================================
-- App Budgets, Goals, Recurring Payments
-- Simplified tables for app_users
-- ============================================

-- Create app_budgets table
CREATE TABLE IF NOT EXISTS app_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT, -- Category name (for simple schema)
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 1 AND 100),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_goals table
CREATE TABLE IF NOT EXISTS app_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_goal_contributions table
CREATE TABLE IF NOT EXISTS app_goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES app_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_recurring_payments table
CREATE TABLE IF NOT EXISTS app_recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  next_date DATE NOT NULL,
  last_processed DATE,
  is_shared BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_budgets_active ON app_budgets(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_app_goals_active ON app_goals(is_completed) WHERE is_completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_app_goal_contributions_goal ON app_goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_app_recurring_active ON app_recurring_payments(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_app_recurring_next_date ON app_recurring_payments(next_date);

-- Trigger for updated_at
CREATE TRIGGER app_budgets_updated_at
  BEFORE UPDATE ON app_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER app_goals_updated_at
  BEFORE UPDATE ON app_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER app_recurring_updated_at
  BEFORE UPDATE ON app_recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to update goal current_amount on contribution
CREATE OR REPLACE FUNCTION update_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE app_goals
    SET current_amount = current_amount + NEW.amount,
        is_completed = (current_amount + NEW.amount >= target_amount),
        completed_at = CASE WHEN (current_amount + NEW.amount >= target_amount) THEN NOW() ELSE NULL END
    WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE app_goals
    SET current_amount = current_amount - OLD.amount,
        is_completed = FALSE,
        completed_at = NULL
    WHERE id = OLD.goal_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goal_on_contribution
  AFTER INSERT OR DELETE ON app_goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_amount();

