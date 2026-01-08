# Stripe Registration & Setup Guide untuk Sparkfluence

## 🔗 Link Penting

| Halaman | URL |
|---------|-----|
| **Registrasi** | https://dashboard.stripe.com/register |
| **Dashboard** | https://dashboard.stripe.com |
| **API Keys** | https://dashboard.stripe.com/apikeys |
| **Webhooks** | https://dashboard.stripe.com/webhooks |
| **Products** | https://dashboard.stripe.com/products |
| **Customer Portal** | https://dashboard.stripe.com/settings/billing/portal |
| **Branding** | https://dashboard.stripe.com/settings/branding |

---

## 📝 Step 1: Registrasi Akun Stripe

1. Buka https://dashboard.stripe.com/register
2. Isi form:
   - Email: (email bisnis kamu)
   - Full name: Ali Sadikin Ma
   - Country: Indonesia
   - Password: (buat password kuat)
3. Verifikasi email
4. **PENTING:** Untuk Indonesia, Stripe belum fully available. Opsi:
   - Gunakan **Stripe Atlas** untuk buat US company ($500 one-time)
   - Atau gunakan **payment gateway lokal** seperti Midtrans/Xendit
   - Untuk development/testing, Stripe test mode tetap bisa dipakai

---

## 🔑 Step 2: Dapatkan API Keys

1. Buka https://dashboard.stripe.com/apikeys
2. Kamu akan lihat 2 keys:
   ```
   Publishable key: pk_test_xxx (untuk frontend, public)
   Secret key: sk_test_xxx (untuk backend, RAHASIA)
   ```
3. Copy kedua keys ini

### Set di Supabase:
```bash
# Via CLI
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx

# Atau via Dashboard:
# Supabase Dashboard → Project Settings → Edge Functions → Secrets
```

---

## 📦 Step 3: Buat Products & Prices

### A. Via Dashboard (Recommended untuk pertama kali)

1. Buka https://dashboard.stripe.com/products
2. Klik **"+ Add product"**

#### Subscription Products:

**Product 1: Sparkfluence Starter**
```
Name: Sparkfluence Starter
Description: 1,000 Sparks/month for individual creators

Pricing:
├── Price 1 (Monthly)
│   ├── Amount: 149000
│   ├── Currency: IDR
│   ├── Billing period: Monthly
│   └── Price ID: (copy ini → price_xxx)
│
└── Price 2 (Yearly)
    ├── Amount: 1199000
    ├── Currency: IDR
    ├── Billing period: Yearly
    └── Price ID: (copy ini → price_xxx)
```

**Product 2: Sparkfluence Pro**
```
Name: Sparkfluence Pro
Description: 3,000 Sparks/month for serious creators

Pricing:
├── Monthly: IDR 349,000
└── Yearly: IDR 2,799,000
```

**Product 3: Sparkfluence Business**
```
Name: Sparkfluence Business
Description: 10,000 Sparks/month for teams and agencies

Pricing:
├── Monthly: IDR 749,000
└── Yearly: IDR 5,999,000
```

#### Top-up Products:

**Product 4: Sparks Top-up - Spark**
```
Name: Sparks Top-up - Spark ⚡
Description: 300 bonus Sparks

Pricing:
├── Type: One-time
├── Amount: 59000
└── Currency: IDR
```

**Product 5: Sparks Top-up - Blaze**
```
Name: Sparks Top-up - Blaze 🔥
Description: 1,000 bonus Sparks

Pricing:
├── Type: One-time
├── Amount: 149000
└── Currency: IDR
```

**Product 6: Sparks Top-up - Inferno**
```
Name: Sparks Top-up - Inferno 🌋
Description: 3,500 bonus Sparks

Pricing:
├── Type: One-time
├── Amount: 399000
└── Currency: IDR
```

---

## 🔄 Step 4: Update Database dengan Price IDs

Setelah buat semua products, copy Price IDs dan update database:

```sql
-- Jalankan di Supabase SQL Editor

-- Subscriptions Monthly
UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'starter' AND billing_cycle = 'monthly';

UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'pro' AND billing_cycle = 'monthly';

UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'business' AND billing_cycle = 'monthly';

-- Subscriptions Yearly
UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'starter' AND billing_cycle = 'yearly';

UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'pro' AND billing_cycle = 'yearly';

UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'business' AND billing_cycle = 'yearly';

-- Top-ups
UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'spark' AND price_type = 'topup';

UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'blaze' AND price_type = 'topup';

UPDATE stripe_prices 
SET stripe_price_id = 'price_1Qxxx', stripe_product_id = 'prod_xxx' 
WHERE plan_id = 'inferno' AND price_type = 'topup';
```

---

## 🪝 Step 5: Setup Webhook

1. Buka https://dashboard.stripe.com/webhooks
2. Klik **"+ Add endpoint"**
3. Isi:
   ```
   Endpoint URL: https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook
   
   Description: Sparkfluence payment webhooks
   ```
4. Pilih events:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Klik **"Add endpoint"**
6. Copy **Signing secret** (whsec_xxx)

### Set Webhook Secret:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 🎨 Step 6: Setup Customer Portal

1. Buka https://dashboard.stripe.com/settings/billing/portal
2. Enable fitur:
   - ✅ Payment methods (update kartu)
   - ✅ Invoice history
   - ✅ Cancel subscription
   - ⚠️ Update subscription (optional, jika mau allow upgrade/downgrade)
3. Customize:
   - Business name: Sparkfluence
   - Headline: Manage your subscription
   - Primary color: (sesuaikan dengan brand)
4. Save

---

## 🚀 Step 7: Deploy Edge Functions

```bash
# Deploy semua functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy customer-portal
supabase functions deploy get-subscription

# Verify secrets sudah di-set
supabase secrets list
```

---

## ✅ Step 8: Test Payment Flow

### Test Cards:
| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |
| `4000 0025 0000 3155` | 🔐 3D Secure |
| `4000 0000 0000 9995` | ❌ Insufficient funds |

### Expiry & CVC:
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)

### Testing Checklist:
- [ ] Buka /pricing, klik "Choose Plan" di Starter
- [ ] Redirect ke Stripe Checkout
- [ ] Bayar dengan test card 4242...
- [ ] Redirect back ke /app/billing?success=true
- [ ] Cek database: subscription updated, sparks added
- [ ] Test Customer Portal: klik "Manage Subscription"
- [ ] Test Top-up (harus subscriber dulu)

---

## 🇮🇩 Catatan untuk Indonesia

Stripe **belum officially available** di Indonesia. Opsi:

### Opsi 1: Stripe Atlas (Recommended untuk serius)
- Buat US LLC via Stripe Atlas ($500)
- Dapat Stripe account US
- Link: https://stripe.com/atlas

### Opsi 2: Gunakan Payment Gateway Lokal
Alternatif yang support IDR & local payment methods:

| Gateway | Website | Pros |
|---------|---------|------|
| **Midtrans** | https://midtrans.com | GoPay, OVO, bank transfer |
| **Xendit** | https://xendit.co | QRIS, e-wallets, VA |
| **Doku** | https://doku.com | Oldest, bank partnerships |

### Opsi 3: Development Mode
- Tetap pakai Stripe test mode untuk development
- Migrate ke local gateway saat production

---

## 📋 Environment Variables Summary

```env
# Stripe (set di Supabase Secrets)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SITE_URL=https://sparkfluence.com  # atau localhost untuk dev

# Supabase (sudah ada)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 🆘 Troubleshooting

### Webhook tidak jalan
1. Cek endpoint URL benar
2. Cek signing secret match
3. Lihat Stripe Dashboard → Webhooks → klik endpoint → lihat logs

### Checkout error "Price not found"
1. Cek stripe_prices table sudah ada data
2. Cek stripe_price_id sudah di-update dengan ID asli dari Stripe
3. Cek is_active = true

### Customer Portal 404
1. Pastikan user punya stripe_customer_id di subscriptions table
2. Customer Portal harus di-enable di Stripe settings

---

## 📞 Support

- Stripe Docs: https://stripe.com/docs
- Stripe Discord: https://discord.gg/stripe
- Supabase Discord: https://discord.supabase.com
