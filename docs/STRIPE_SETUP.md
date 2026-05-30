# Stripe Integration Setup Guide

## 1. Environment Variables

Add these to your `.env` file and Supabase Edge Function secrets:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxx  # or sk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxx
SITE_URL=https://your-domain.com  # or http://localhost:5173 for dev
```

## 2. Create Stripe Products & Prices

Run these in your Stripe Dashboard or via API:

### Subscription Products

#### Starter Plan
- Product Name: `Sparkfluence Starter`
- Monthly Price: `price_starter_monthly` - IDR 149,000/month
- Yearly Price: `price_starter_yearly` - IDR 1,199,000/year

#### Pro Plan  
- Product Name: `Sparkfluence Pro`
- Monthly Price: `price_pro_monthly` - IDR 349,000/month
- Yearly Price: `price_pro_yearly` - IDR 2,799,000/year

#### Business Plan
- Product Name: `Sparkfluence Business`
- Monthly Price: `price_business_monthly` - IDR 749,000/month
- Yearly Price: `price_business_yearly` - IDR 5,999,000/year

### Top-up Products

#### Spark Package
- Product Name: `Sparks Top-up - Spark`
- One-time Price: `price_topup_spark` - IDR 59,000

#### Blaze Package
- Product Name: `Sparks Top-up - Blaze`
- One-time Price: `price_topup_blaze` - IDR 149,000

#### Inferno Package
- Product Name: `Sparks Top-up - Inferno`
- One-time Price: `price_topup_inferno` - IDR 399,000

## 3. Update Database with Stripe Price IDs

After creating products in Stripe Dashboard, update the `stripe_prices` table:

```sql
-- Update with your actual Stripe price IDs
UPDATE stripe_prices SET stripe_price_id = 'price_xxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'starter' AND billing_cycle = 'monthly';

UPDATE stripe_prices SET stripe_price_id = 'price_xxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'starter' AND billing_cycle = 'yearly';

-- Repeat for all plans...
```

## 4. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-supabase-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## 5. Configure Stripe Customer Portal

1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Enable features:
   - Update payment methods
   - View invoice history
   - Cancel subscription
   - Update subscription (if allowing plan changes)
3. Set business information and branding

## 6. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy customer-portal
supabase functions deploy get-subscription

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set SITE_URL=https://your-domain.com
```

## 7. Run Database Migration

```bash
supabase db push
```

## 8. Test Checklist

- [ ] Create checkout session (subscription)
- [ ] Create checkout session (top-up)
- [ ] Webhook receives `checkout.session.completed`
- [ ] Subscription created in database
- [ ] Sparks added to balance
- [ ] Customer portal opens
- [ ] Subscription renewal adds sparks
- [ ] Subscription cancellation downgrades to free

## Stripe Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

## File Structure Created

```
supabase/
├── migrations/
│   └── 20250108000001_create_subscriptions_table.sql
└── functions/
    ├── create-checkout/index.ts
    ├── stripe-webhook/index.ts
    ├── customer-portal/index.ts
    └── get-subscription/index.ts

src/
├── hooks/
│   └── useSubscription.ts
└── screens/
    ├── Billing/
    │   ├── Billing.tsx
    │   └── index.ts
    └── Pricing/
        └── components/
            ├── PricingCard.tsx (updated)
            └── TopUpPackages.tsx (updated)
```
