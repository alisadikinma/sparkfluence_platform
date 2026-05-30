# Sparkfluence v2 - Deployment Checklist

## Environment Variables to Set

### Backend (VPS - Python FastAPI)

```bash
# Required for CORS whitelist
FRONTEND_URL=https://sparkfluence.app

# Required for webhook signature verification
GEMINIGEN_WEBHOOK_SECRET=your_webhook_secret_from_geminigen_dashboard

# Optional: Skip signature verification in development
WEBHOOK_SKIP_VERIFICATION=false  # Set to 'true' only for local testing
```

### Supabase Edge Functions

```bash
# Set via Supabase Dashboard > Settings > Edge Functions > Secrets
# Or via CLI: supabase secrets set KEY=value

FRONTEND_URL=https://sparkfluence.app
```

---

## Cron Jobs to Configure

The webhook handler requires external cron jobs to trigger scheduled tasks.

### 1. Process Pending Retries (Every 1 minute)

**Endpoint:** `GET https://your-backend-url/webhook/process-pending-retries`

**Purpose:** Picks up jobs with `next_retry_at` in the past and triggers resubmission.

**Example cron expression:** `* * * * *` (every minute)

```bash
# Using curl
curl -X GET https://your-backend-url/webhook/process-pending-retries

# Expected response
{"status": "ok", "processed": 0, "found": 0}
```

### 2. Cleanup Stale Jobs (Every 5 minutes)

**Endpoint:** `GET https://your-backend-url/webhook/cleanup-stale-jobs`

**Purpose:** Marks jobs stuck in PROCESSING (status=1) for >30 minutes as failed.

**Example cron expression:** `*/5 * * * *` (every 5 minutes)

```bash
# Using curl
curl -X GET https://your-backend-url/webhook/cleanup-stale-jobs

# Expected response
{"status": "ok", "cleaned": 0, "message": "No stale jobs found"}
```

### 3. Health Check (Every 5 minutes - optional)

**Endpoint:** `GET https://your-backend-url/webhook/health`

**Purpose:** Monitor webhook handler status.

```bash
# Expected response
{
  "status": "ok",
  "service": "webhook_handler",
  "max_retries": 3,
  "retry_delay_minutes": 1,
  "stale_timeout_minutes": 30
}
```

---

## Cron Service Options

### Option A: cron-job.org (Free)

1. Go to https://cron-job.org
2. Create account and add jobs:
   - Job 1: `https://your-backend-url/webhook/process-pending-retries` - Every 1 minute
   - Job 2: `https://your-backend-url/webhook/cleanup-stale-jobs` - Every 5 minutes

### Option B: Vercel Cron (if using Vercel)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-retries",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/cleanup-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Option C: Server Crontab (Linux VPS)

```bash
# Edit crontab
crontab -e

# Add these lines
* * * * * curl -s https://your-backend-url/webhook/process-pending-retries > /dev/null
*/5 * * * * curl -s https://your-backend-url/webhook/cleanup-stale-jobs > /dev/null
```

### Option D: Supabase pg_cron (Database-level)

```sql
-- Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: pg_cron cannot call HTTP endpoints directly
-- Use pg_net extension or create a database function instead
```

---

## Database Migration

Run the following migration to fix RLS policies:

```bash
# Local development
supabase db push

# Or run SQL directly in Supabase Dashboard > SQL Editor
# Copy contents of: supabase/migrations/20260116000000_fix_webhook_events_rls.sql
```

---

## Verification Checklist

### Security
- [ ] `FRONTEND_URL` environment variable is set
- [ ] `GEMINIGEN_WEBHOOK_SECRET` is set (get from GeminiGen dashboard)
- [ ] CORS rejects requests from unknown origins
- [ ] Webhook without signature returns 401

### Reliability
- [ ] Cron job for `process-pending-retries` is running
- [ ] Cron job for `cleanup-stale-jobs` is running
- [ ] Health check endpoint responds correctly

### Database
- [ ] Migration `20260116000000_fix_webhook_events_rls.sql` is applied
- [ ] `webhook_events` table has proper RLS policies
- [ ] `video_generation_jobs.version` column exists

---

## GeminiGen Webhook Configuration

1. Go to GeminiGen.ai Dashboard
2. Navigate to Settings > Webhooks
3. Set webhook URL to: `https://your-backend-url/webhook`
4. Copy the webhook secret and set as `GEMINIGEN_WEBHOOK_SECRET`
5. Enable events:
   - `VIDEO_GENERATION_COMPLETED`
   - `VIDEO_GENERATION_FAILED`

---

## Quick Test Commands

```bash
# Test CORS (should fail from unknown origin)
curl -H "Origin: https://malicious-site.com" https://your-backend-url/health

# Test webhook health
curl https://your-backend-url/webhook/health

# Test manual retry (requires valid job_id)
curl -X POST https://your-backend-url/webhook/manual-retry/{job_id}

# Test cleanup (should return 0 if no stale jobs)
curl https://your-backend-url/webhook/cleanup-stale-jobs
```
