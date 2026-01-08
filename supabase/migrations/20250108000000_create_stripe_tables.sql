-- ============================================
-- STRIPE INTEGRATION TABLES
-- ============================================

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe IDs
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    
    -- Plan info
    plan_id TEXT NOT NULL DEFAULT 'free', -- free, starter, pro, business
    billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, unpaid, trialing
    
    -- Dates
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sparks Balance Table
CREATE TABLE IF NOT EXISTS public.sparks_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Balance
    current_balance INTEGER NOT NULL DEFAULT 0,
    monthly_allocation INTEGER NOT NULL DEFAULT 30, -- Based on plan
    bonus_sparks INTEGER NOT NULL DEFAULT 0, -- From yearly subscription
    
    -- Usage tracking
    used_this_period INTEGER NOT NULL DEFAULT 0,
    
    -- Reset tracking
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    next_reset_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sparks Transactions Table (audit log)
CREATE TABLE IF NOT EXISTS public.sparks_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction details
    amount INTEGER NOT NULL, -- positive = credit, negative = debit
    balance_after INTEGER NOT NULL,
    
    -- Type
    transaction_type TEXT NOT NULL, -- subscription_credit, topup, usage, refund, bonus, rollover
    
    -- Reference
    reference_type TEXT, -- subscription, topup, script_lab, visual_forge, video_genie, viral_script_gen
    reference_id TEXT,
    
    -- Description
    description TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe IDs
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_invoice_id TEXT,
    stripe_checkout_session_id TEXT,
    
    -- Payment details
    amount INTEGER NOT NULL, -- in smallest currency unit (cents/rupiah)
    currency TEXT NOT NULL DEFAULT 'idr',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
    
    -- Type
    payment_type TEXT NOT NULL, -- subscription, topup
    
    -- Reference
    plan_id TEXT, -- for subscription
    topup_package_id TEXT, -- for topup (spark, blaze, inferno)
    sparks_amount INTEGER, -- sparks credited
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Stripe Price Mapping Table
CREATE TABLE IF NOT EXISTS public.stripe_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identifiers
    plan_id TEXT NOT NULL, -- free, starter, pro, business, spark, blaze, inferno
    billing_cycle TEXT, -- monthly, yearly, null for topup
    price_type TEXT NOT NULL, -- subscription, topup
    
    -- Stripe IDs
    stripe_price_id TEXT NOT NULL UNIQUE,
    stripe_product_id TEXT NOT NULL,
    
    -- Price info (for reference)
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'idr',
    
    -- Sparks
    sparks_amount INTEGER NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(plan_id, billing_cycle, price_type)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_sparks_balance_user_id ON public.sparks_balance(user_id);

CREATE INDEX IF NOT EXISTS idx_sparks_transactions_user_id ON public.sparks_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sparks_transactions_type ON public.sparks_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sparks_transactions_created_at ON public.sparks_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_stripe_prices_plan_id ON public.stripe_prices(plan_id);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_stripe_price_id ON public.stripe_prices(stripe_price_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE OR REPLACE FUNCTION trg_fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscriptions_set_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_sparks_balance_set_updated_at
    BEFORE UPDATE ON public.sparks_balance
    FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_payments_set_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can only see their own
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Sparks Balance: Users can only see their own
CREATE POLICY "Users can view own sparks balance"
    ON public.sparks_balance FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sparks balance"
    ON public.sparks_balance FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Sparks Transactions: Users can only see their own
CREATE POLICY "Users can view own transactions"
    ON public.sparks_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
    ON public.sparks_transactions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Payments: Users can only see their own
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments"
    ON public.payments FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Stripe Prices: Everyone can read (public catalog)
CREATE POLICY "Anyone can view active prices"
    ON public.stripe_prices FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Service role can manage prices"
    ON public.stripe_prices FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to initialize sparks balance for new user
CREATE OR REPLACE FUNCTION init_sparks_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.sparks_balance (user_id, current_balance, monthly_allocation, next_reset_at)
    VALUES (NEW.id, 30, 30, NOW() + INTERVAL '1 month')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create sparks balance on user creation
DROP TRIGGER IF EXISTS trg_init_sparks_balance ON auth.users;
CREATE TRIGGER trg_init_sparks_balance
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION init_sparks_balance();

-- Function to deduct sparks
CREATE OR REPLACE FUNCTION deduct_sparks(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_type TEXT,
    p_reference_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with lock
    SELECT current_balance INTO v_current_balance
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
    SET current_balance = v_new_balance,
        used_this_period = used_this_period + p_amount,
        updated_at = NOW()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add sparks (for subscriptions/topups)
CREATE OR REPLACE FUNCTION add_sparks(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT, -- subscription_credit, topup, bonus, refund
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT) AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Add sparks
    UPDATE public.sparks_balance
    SET current_balance = current_balance + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING current_balance INTO v_new_balance;
    
    IF v_new_balance IS NULL THEN
        -- Create balance if not exists
        INSERT INTO public.sparks_balance (user_id, current_balance, monthly_allocation)
        VALUES (p_user_id, p_amount, 30)
        RETURNING current_balance INTO v_new_balance;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current plan info
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TABLE(
    plan_id TEXT,
    billing_cycle TEXT,
    status TEXT,
    current_balance INTEGER,
    monthly_allocation INTEGER,
    used_this_period INTEGER,
    current_period_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(s.plan_id, 'free'),
        s.billing_cycle,
        COALESCE(s.status, 'active'),
        COALESCE(b.current_balance, 0),
        COALESCE(b.monthly_allocation, 30),
        COALESCE(b.used_this_period, 0),
        s.current_period_end
    FROM public.sparks_balance b
    LEFT JOIN public.subscriptions s ON s.user_id = b.user_id AND s.status = 'active'
    WHERE b.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED STRIPE PRICES (placeholder - update with real Stripe IDs)
-- ============================================

-- These will be updated after creating products in Stripe Dashboard
INSERT INTO public.stripe_prices (plan_id, billing_cycle, price_type, stripe_price_id, stripe_product_id, amount, currency, sparks_amount)
VALUES
    -- Subscriptions Monthly
    ('starter', 'monthly', 'subscription', 'price_starter_monthly_PLACEHOLDER', 'prod_starter_PLACEHOLDER', 149000, 'idr', 1000),
    ('pro', 'monthly', 'subscription', 'price_pro_monthly_PLACEHOLDER', 'prod_pro_PLACEHOLDER', 349000, 'idr', 3000),
    ('business', 'monthly', 'subscription', 'price_business_monthly_PLACEHOLDER', 'prod_business_PLACEHOLDER', 749000, 'idr', 10000),
    
    -- Subscriptions Yearly
    ('starter', 'yearly', 'subscription', 'price_starter_yearly_PLACEHOLDER', 'prod_starter_PLACEHOLDER', 1199000, 'idr', 13200),
    ('pro', 'yearly', 'subscription', 'price_pro_yearly_PLACEHOLDER', 'prod_pro_PLACEHOLDER', 2799000, 'idr', 39600),
    ('business', 'yearly', 'subscription', 'price_business_yearly_PLACEHOLDER', 'prod_business_PLACEHOLDER', 5999000, 'idr', 132000),
    
    -- Top-up Packages
    ('spark', NULL, 'topup', 'price_spark_topup_PLACEHOLDER', 'prod_topup_PLACEHOLDER', 59000, 'idr', 300),
    ('blaze', NULL, 'topup', 'price_blaze_topup_PLACEHOLDER', 'prod_topup_PLACEHOLDER', 149000, 'idr', 1000),
    ('inferno', NULL, 'topup', 'price_inferno_topup_PLACEHOLDER', 'prod_topup_PLACEHOLDER', 399000, 'idr', 3500)
ON CONFLICT (plan_id, billing_cycle, price_type) DO UPDATE SET
    amount = EXCLUDED.amount,
    sparks_amount = EXCLUDED.sparks_amount,
    updated_at = NOW();
