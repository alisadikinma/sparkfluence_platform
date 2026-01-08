-- ============================================
-- Subscriptions & Billing System for Sparkfluence
-- ============================================

-- 0. Stripe Prices Table (Product Catalog)
CREATE TABLE IF NOT EXISTS public.stripe_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Stripe IDs
    stripe_product_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL UNIQUE,
    
    -- Plan Details
    plan_id TEXT NOT NULL, -- free, starter, pro, business, spark, blaze, inferno
    price_type TEXT NOT NULL, -- subscription, topup
    billing_cycle TEXT, -- monthly, yearly, null for topup
    
    -- Pricing
    amount INTEGER NOT NULL, -- in smallest currency unit
    currency TEXT NOT NULL DEFAULT 'idr',
    
    -- Sparks
    sparks_amount INTEGER NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_price_type CHECK (price_type IN ('subscription', 'topup'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_prices_plan_id ON public.stripe_prices(plan_id);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_stripe_price_id ON public.stripe_prices(stripe_price_id);

-- Insert default prices (UPDATE stripe_price_id after creating in Stripe Dashboard)
-- Use DO NOTHING to skip if already exists (handles multiple unique constraints)
INSERT INTO public.stripe_prices (stripe_product_id, stripe_price_id, plan_id, price_type, billing_cycle, amount, currency, sparks_amount) VALUES
    -- Subscriptions Monthly
    ('prod_starter', 'price_starter_monthly', 'starter', 'subscription', 'monthly', 149000, 'idr', 1000),
    ('prod_pro', 'price_pro_monthly', 'pro', 'subscription', 'monthly', 349000, 'idr', 3000),
    ('prod_business', 'price_business_monthly', 'business', 'subscription', 'monthly', 749000, 'idr', 10000),
    -- Subscriptions Yearly
    ('prod_starter', 'price_starter_yearly', 'starter', 'subscription', 'yearly', 1199000, 'idr', 13200),
    ('prod_pro', 'price_pro_yearly', 'pro', 'subscription', 'yearly', 2799000, 'idr', 39600),
    ('prod_business', 'price_business_yearly', 'business', 'subscription', 'yearly', 5999000, 'idr', 132000),
    -- Top-up Packages
    ('prod_topup_spark', 'price_topup_spark', 'spark', 'topup', NULL, 59000, 'idr', 300),
    ('prod_topup_blaze', 'price_topup_blaze', 'blaze', 'topup', NULL, 149000, 'idr', 1000),
    ('prod_topup_inferno', 'price_topup_inferno', 'inferno', 'topup', NULL, 399000, 'idr', 3500)
ON CONFLICT DO NOTHING;

-- RLS for stripe_prices (public read)
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active prices" ON public.stripe_prices;
CREATE POLICY "Anyone can view active prices"
    ON public.stripe_prices FOR SELECT
    USING (is_active = true);

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe IDs
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    
    -- Plan Details
    plan_id TEXT NOT NULL DEFAULT 'free', -- free, starter, pro, business
    billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, trialing, paused
    
    -- Dates
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_plan CHECK (plan_id IN ('free', 'starter', 'pro', 'business')),
    CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused', 'incomplete'))
);

-- 2. Sparks Balance Table (Credits)
CREATE TABLE IF NOT EXISTS public.sparks_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Balance
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    
    -- Monthly allocation tracking
    monthly_allocation INTEGER NOT NULL DEFAULT 0,
    allocation_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- 3. Sparks Transactions Table (Audit Log)
CREATE TABLE IF NOT EXISTS public.sparks_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction Details
    amount INTEGER NOT NULL, -- positive = credit, negative = debit
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- subscription, topup, usage, refund, bonus, adjustment
    
    -- Reference
    reference_type TEXT, -- subscription, topup_order, video_job, image_job, script_gen
    reference_id TEXT,
    
    -- Description
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('subscription', 'topup', 'usage', 'refund', 'bonus', 'adjustment'))
);

-- 4. Top-Up Orders Table
CREATE TABLE IF NOT EXISTS public.topup_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT UNIQUE,
    
    -- Package Details
    package_id TEXT NOT NULL, -- spark, blaze, inferno
    sparks_amount INTEGER NOT NULL,
    price_idr INTEGER NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_package CHECK (package_id IN ('spark', 'blaze', 'inferno')),
    CONSTRAINT valid_topup_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- 5. Payment History Table
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    stripe_charge_id TEXT,
    
    -- Payment Details
    amount INTEGER NOT NULL, -- in smallest currency unit (cents/rupiah)
    currency TEXT NOT NULL DEFAULT 'idr',
    payment_type TEXT NOT NULL, -- subscription, topup
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
    
    -- Reference
    reference_type TEXT, -- subscription, topup_order
    reference_id UUID,
    
    -- Receipt
    receipt_url TEXT,
    invoice_pdf TEXT,
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_payment_type CHECK (payment_type IN ('subscription', 'topup')),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded'))
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_sparks_balance_user_id ON public.sparks_balance(user_id);

CREATE INDEX IF NOT EXISTS idx_sparks_transactions_user_id ON public.sparks_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sparks_transactions_created_at ON public.sparks_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sparks_transactions_type ON public.sparks_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_topup_orders_user_id ON public.topup_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_orders_stripe_session ON public.topup_orders(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at DESC);

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trg_fn_subscriptions_set_updated_at()
RETURNS TRIGGER AS $trg$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_set_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_subscriptions_set_updated_at();

CREATE OR REPLACE FUNCTION trg_fn_sparks_balance_set_updated_at()
RETURNS TRIGGER AS $trg$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sparks_balance_set_updated_at ON public.sparks_balance;
CREATE TRIGGER trg_sparks_balance_set_updated_at
    BEFORE UPDATE ON public.sparks_balance
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_sparks_balance_set_updated_at();

-- Auto-create subscription and sparks_balance for new users
CREATE OR REPLACE FUNCTION trg_fn_create_user_billing()
RETURNS TRIGGER AS $trg$
BEGIN
    -- Create free subscription
    INSERT INTO public.subscriptions (user_id, plan_id, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT DO NOTHING;
    
    -- Create sparks balance with free tier allocation (30 sparks)
    INSERT INTO public.sparks_balance (user_id, balance, monthly_allocation, allocation_date)
    VALUES (NEW.id, 30, 30, NOW())
    ON CONFLICT DO NOTHING;
    
    -- Log initial sparks transaction
    INSERT INTO public.sparks_transactions (user_id, amount, balance_after, transaction_type, description)
    VALUES (NEW.id, 30, 30, 'subscription', 'Welcome bonus - Free tier')
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$trg$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_user_billing ON auth.users;
CREATE TRIGGER trg_create_user_billing
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_create_user_billing();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can view their own
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Sparks Balance: Users can view their own
DROP POLICY IF EXISTS "Users can view own sparks balance" ON public.sparks_balance;
CREATE POLICY "Users can view own sparks balance"
    ON public.sparks_balance FOR SELECT
    USING (auth.uid() = user_id);

-- Sparks Transactions: Users can view their own
DROP POLICY IF EXISTS "Users can view own sparks transactions" ON public.sparks_transactions;
CREATE POLICY "Users can view own sparks transactions"
    ON public.sparks_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Top-Up Orders: Users can view their own
DROP POLICY IF EXISTS "Users can view own topup orders" ON public.topup_orders;
CREATE POLICY "Users can view own topup orders"
    ON public.topup_orders FOR SELECT
    USING (auth.uid() = user_id);

-- Payment History: Users can view their own
DROP POLICY IF EXISTS "Users can view own payment history" ON public.payment_history;
CREATE POLICY "Users can view own payment history"
    ON public.payment_history FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to deduct sparks (called by Edge Functions)
DROP FUNCTION IF EXISTS deduct_sparks(UUID, INTEGER, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION deduct_sparks(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock the row for update
    SELECT balance INTO v_current_balance
    FROM public.sparks_balance
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User balance not found'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient sparks'::TEXT;
        RETURN;
    END IF;
    
    -- Deduct sparks
    v_new_balance := v_current_balance - p_amount;
    
    UPDATE public.sparks_balance
    SET 
        balance = v_new_balance,
        lifetime_spent = lifetime_spent + p_amount
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO public.sparks_transactions (
        user_id, amount, balance_after, transaction_type,
        reference_type, reference_id, description
    ) VALUES (
        p_user_id, -p_amount, v_new_balance, 'usage',
        p_reference_type, p_reference_id, p_description
    );
    
    RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Function to add sparks (called by Edge Functions)
DROP FUNCTION IF EXISTS add_sparks(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION add_sparks(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock the row for update
    SELECT balance INTO v_current_balance
    FROM public.sparks_balance
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
        -- Create balance if not exists
        INSERT INTO public.sparks_balance (user_id, balance, lifetime_earned, monthly_allocation)
        VALUES (p_user_id, p_amount, p_amount, 0);
        v_new_balance := p_amount;
    ELSE
        v_new_balance := v_current_balance + p_amount;
        
        UPDATE public.sparks_balance
        SET 
            balance = v_new_balance,
            lifetime_earned = lifetime_earned + p_amount
        WHERE user_id = p_user_id;
    END IF;
    
    -- Log transaction
    INSERT INTO public.sparks_transactions (
        user_id, amount, balance_after, transaction_type,
        reference_type, reference_id, description
    ) VALUES (
        p_user_id, p_amount, v_new_balance, p_transaction_type,
        p_reference_type, p_reference_id, p_description
    );
    
    RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Function to get user subscription with sparks
DROP FUNCTION IF EXISTS get_user_billing(UUID);
CREATE OR REPLACE FUNCTION get_user_billing(p_user_id UUID)
RETURNS TABLE(
    plan_id TEXT,
    billing_cycle TEXT,
    status TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    sparks_balance INTEGER,
    monthly_allocation INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.plan_id,
        s.billing_cycle,
        s.status,
        s.current_period_end,
        s.cancel_at_period_end,
        COALESCE(sb.balance, 0),
        COALESCE(sb.monthly_allocation, 0)
    FROM public.subscriptions s
    LEFT JOIN public.sparks_balance sb ON sb.user_id = s.user_id
    WHERE s.user_id = p_user_id
    LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION deduct_sparks TO authenticated;
GRANT EXECUTE ON FUNCTION add_sparks TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_billing TO authenticated;
