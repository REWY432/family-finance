-- ============================================
-- Family Finance Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FAMILIES (for shared finances)
-- ============================================
CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members
CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    nickname TEXT, -- Display name within family (e.g., "Титов", "Честнейшина")
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- ============================================
-- ACCOUNTS (bank accounts, cash, etc.)
-- ============================================
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'checking' CHECK (type IN ('checking', 'savings', 'credit', 'cash', 'investment')),
    currency TEXT NOT NULL DEFAULT 'RUB',
    initial_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    color TEXT DEFAULT '#007AFF',
    icon TEXT DEFAULT '💳',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#8E8E93',
    parent_id UUID REFERENCES public.categories(id), -- For subcategories
    keywords TEXT[] DEFAULT '{}', -- For auto-categorization
    is_system BOOLEAN DEFAULT FALSE, -- System categories can't be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, name, type)
);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'RUB',
    
    description TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Flags
    is_shared BOOLEAN DEFAULT FALSE, -- Split between family members
    is_recurring BOOLEAN DEFAULT FALSE,
    is_credit BOOLEAN DEFAULT FALSE,
    
    -- For transfers
    to_account_id UUID REFERENCES public.accounts(id),
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    receipt_url TEXT,
    location TEXT,
    
    -- Auto-categorization confidence (0-1)
    auto_category_confidence DECIMAL(3,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_family_date ON public.transactions(family_id, date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_is_shared ON public.transactions(is_shared) WHERE is_shared = TRUE;

-- ============================================
-- BUDGETS
-- ============================================
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
    
    alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 1 AND 100),
    
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🎯',
    
    target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15,2) DEFAULT 0 CHECK (current_amount >= 0),
    
    deadline DATE,
    
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal contributions
CREATE TABLE public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RECURRING PAYMENTS
-- ============================================
CREATE TABLE public.recurring_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id),
    category_id UUID REFERENCES public.categories(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    
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

-- ============================================
-- ANALYTICS CACHE (for expensive calculations)
-- ============================================
CREATE TABLE public.analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    
    cache_key TEXT NOT NULL,
    data JSONB NOT NULL,
    
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(family_id, cache_key)
);

-- ============================================
-- CATEGORY KEYWORDS (for auto-categorization)
-- ============================================
CREATE TABLE public.category_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    
    pattern TEXT NOT NULL, -- Regex or simple keyword
    priority INTEGER DEFAULT 0, -- Higher = checked first
    match_count INTEGER DEFAULT 0, -- Times this rule matched
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FINANCIAL HEALTH SNAPSHOTS
-- ============================================
CREATE TABLE public.health_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Scores (0-100)
    overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    savings_score INTEGER CHECK (savings_score BETWEEN 0 AND 100),
    budget_score INTEGER CHECK (budget_score BETWEEN 0 AND 100),
    debt_score INTEGER CHECK (debt_score BETWEEN 0 AND 100),
    stability_score INTEGER CHECK (stability_score BETWEEN 0 AND 100),
    
    -- Raw metrics
    metrics JSONB NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(family_id, snapshot_date)
);

-- ============================================
-- ANOMALIES
-- ============================================
CREATE TABLE public.anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('high_amount', 'unusual_category', 'frequency', 'new_merchant')),
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'alert')),
    
    message TEXT NOT NULL,
    details JSONB,
    
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_by UUID REFERENCES public.profiles(id),
    dismissed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Family members can see other profiles in their family
CREATE POLICY "Family members can see each other" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT fm.user_id FROM public.family_members fm
            WHERE fm.family_id IN (
                SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
            )
        )
    );

-- Family data: only members can access
CREATE POLICY "Family members can access family data" ON public.families
    FOR ALL USING (
        id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
    );

-- Generic policy for family-scoped tables
CREATE OR REPLACE FUNCTION is_family_member(family_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_id = family_uuid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all family-scoped tables
CREATE POLICY "Family access" ON public.family_members FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.accounts FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.categories FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.transactions FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.budgets FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.goals FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.recurring_payments FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.analytics_cache FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.category_rules FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.health_snapshots FOR ALL USING (is_family_member(family_id));
CREATE POLICY "Family access" ON public.anomalies FOR ALL USING (is_family_member(family_id));

-- Goal contributions
CREATE POLICY "Family access" ON public.goal_contributions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.goals g
        WHERE g.id = goal_id AND is_family_member(g.family_id)
    )
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON public.recurring_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update account balance on transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.account_id;
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.to_account_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.account_id;
            UPDATE public.accounts SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.to_account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_transaction
    AFTER INSERT OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Update goal progress on contribution
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.goals
        SET current_amount = current_amount + NEW.amount,
            is_completed = (current_amount + NEW.amount >= target_amount),
            completed_at = CASE WHEN (current_amount + NEW.amount >= target_amount) THEN NOW() ELSE NULL END
        WHERE id = NEW.goal_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.goals
        SET current_amount = current_amount - OLD.amount,
            is_completed = FALSE,
            completed_at = NULL
        WHERE id = OLD.goal_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goal_on_contribution
    AFTER INSERT OR DELETE ON public.goal_contributions
    FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

-- ============================================
-- DEFAULT DATA FUNCTION
-- ============================================

-- Create default categories for a new family
CREATE OR REPLACE FUNCTION create_default_categories(family_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Expense categories
    INSERT INTO public.categories (family_id, name, type, icon, keywords, is_system) VALUES
        (family_uuid, 'Продукты', 'expense', '🛒', ARRAY['магнит', 'пятерочка', 'перекресток', 'ашан', 'лента', 'продукты', 'еда', 'супермаркет'], TRUE),
        (family_uuid, 'Транспорт', 'expense', '🚗', ARRAY['бензин', 'метро', 'такси', 'яндекс', 'uber', 'автобус', 'парковка', 'мойка'], TRUE),
        (family_uuid, 'Рестораны', 'expense', '🍽️', ARRAY['кафе', 'ресторан', 'макдональдс', 'kfc', 'бургер', 'пицца', 'суши', 'доставка еды'], TRUE),
        (family_uuid, 'Развлечения', 'expense', '🎬', ARRAY['кино', 'театр', 'концерт', 'netflix', 'spotify', 'игры', 'подписка'], TRUE),
        (family_uuid, 'Одежда', 'expense', '👕', ARRAY['одежда', 'обувь', 'zara', 'h&m', 'uniqlo', 'спортмастер'], TRUE),
        (family_uuid, 'Здоровье', 'expense', '💊', ARRAY['аптека', 'врач', 'клиника', 'анализы', 'стоматолог', 'лекарства'], TRUE),
        (family_uuid, 'Коммуналка', 'expense', '🏠', ARRAY['жкх', 'электричество', 'газ', 'вода', 'интернет', 'телефон', 'аренда'], TRUE),
        (family_uuid, 'Образование', 'expense', '📚', ARRAY['курсы', 'книги', 'обучение', 'школа', 'университет'], TRUE),
        (family_uuid, 'Подарки', 'expense', '🎁', ARRAY['подарок', 'цветы', 'праздник'], FALSE),
        (family_uuid, 'Путешествия', 'expense', '✈️', ARRAY['отель', 'билет', 'самолет', 'поезд', 'тур'], FALSE),
        (family_uuid, 'Красота', 'expense', '💅', ARRAY['салон', 'парикмахер', 'маникюр', 'косметика'], FALSE),
        (family_uuid, 'Питомцы', 'expense', '🐾', ARRAY['корм', 'ветеринар', 'зоомагазин'], FALSE),
        (family_uuid, 'Другое', 'expense', '📦', ARRAY[]::TEXT[], TRUE);
    
    -- Income categories
    INSERT INTO public.categories (family_id, name, type, icon, keywords, is_system) VALUES
        (family_uuid, 'Зарплата', 'income', '💰', ARRAY['зарплата', 'аванс', 'оклад'], TRUE),
        (family_uuid, 'Фриланс', 'income', '💻', ARRAY['фриланс', 'проект', 'заказ'], FALSE),
        (family_uuid, 'Инвестиции', 'income', '📈', ARRAY['дивиденды', 'проценты', 'акции'], FALSE),
        (family_uuid, 'Подарки', 'income', '🎁', ARRAY['подарок', 'перевод'], FALSE),
        (family_uuid, 'Возврат', 'income', '↩️', ARRAY['возврат', 'кэшбэк', 'cashback'], FALSE),
        (family_uuid, 'Другое', 'income', '📦', ARRAY[]::TEXT[], TRUE);
END;
$$ LANGUAGE plpgsql;
