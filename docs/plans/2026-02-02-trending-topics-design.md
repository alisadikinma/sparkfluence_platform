# Trending Topics Enhancement - Design Document

**Date:** 2026-02-02
**Status:** Approved
**Scope:** Multi-source trending data + topic deduplication + UI overhaul

---

## Problem

1. Topic recommendations only use Google Trends RSS — missing TikTok and Instagram trends
2. No deduplication — previously used topics can reappear
3. UI limited to 6 static topics with no "load more" option
4. Topic cards lack visual distinction and trending source context

## Solution

Multi-source trending data collection (Google + TikTok + Instagram) stored in DB, fed into LLM topic generation with per-user deduplication and redesigned UI with load-more capability.

---

## Architecture

```
pg_cron (every 4 hours)
    │
    ▼
fetch-trending-data (Edge Function)
    ├── Google Trends RSS (ID, US, FR)
    ├── TikTok Creative Center (ID, US, FR — skip IN, TikTok banned)
    └── Instagram via RapidAPI free tier (daily, key rotation)
    │
    ▼
trending_topics table (normalized, 8hr TTL)
    │
    ▼
generate-topic-suggestions (Edge Function, enhanced)
    ├── Reads 30 trending keywords from trending_topics
    ├── Reads user_topic_history for dedup (last 30 days)
    ├── Supports batch parameter for "Load More"
    └── LLM generates 6 topics per batch, tagged with source
    │
    ▼
TopicSelection screen (redesigned)
    ├── Trending source badges (TikTok/Google/IG/AI)
    ├── Related hashtags per topic
    └── "Load More" button (max 4 batches = 24 topics)
```

### Data Sources per Country

| Country | Google Trends | TikTok | Instagram |
|---------|:---:|:---:|:---:|
| ID (Indonesia) | ✅ | ✅ | ✅ |
| US (English) | ✅ | ✅ | ✅ |
| IN (India) | ✅ | ❌ (banned) | ✅ |
| FR (France) | ✅ | ✅ | ✅ |

### Instagram Rate Limiting Strategy

- RapidAPI free tier: 100 requests/month per account
- Use existing `api_keys_pool` table with multiple accounts for key rotation
- Fetch IG trending data **once per day** (not every 4 hours) to conserve quota
- Rotation via existing `get_available_api_key('rapidapi_instagram')` function

---

## Database Changes

### New Table: `trending_topics`

```sql
CREATE TABLE trending_topics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,          -- 'google' | 'tiktok' | 'instagram'
  keyword text NOT NULL,
  country text NOT NULL,         -- 'ID' | 'US' | 'IN' | 'FR'
  category text,
  volume_score int DEFAULT 0,    -- normalized 0-100
  raw_data jsonb,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz,        -- fetched_at + 8 hours
  UNIQUE(source, keyword, country, fetched_at::date)
);

CREATE INDEX idx_trending_topics_lookup
  ON trending_topics(country, expires_at DESC);
```

### New Table: `user_topic_history`

```sql
CREATE TABLE user_topic_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  topic_title text NOT NULL,
  topic_description text,
  trending_source text,
  trending_keyword text,
  action text DEFAULT 'selected', -- 'selected' | 'skipped'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_topic_history_user
  ON user_topic_history(user_id, created_at DESC);

-- RLS policies
ALTER TABLE user_topic_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_topic_history ON user_topic_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_topic_history ON user_topic_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Existing Table Reuse

- **`api_keys_pool`** — insert RapidAPI Instagram keys as new rows with `provider = 'rapidapi_instagram'`
- **`generation_sessions`** — existing `topic` column used as additional dedup signal
- Rotation functions already exist: `get_available_api_key()`, `increment_api_key_usage()`, `mark_api_key_exhausted()`

---

## Edge Functions

### New: `fetch-trending-data`

Scheduled function that collects trending data from all sources.

**Trigger:** pg_cron every 4 hours, OR external cron (GitHub Actions) calling via HTTP

**Flow:**
1. Google Trends RSS — fetch per country (ID, US, FR), parse XML, extract trending searches
2. TikTok Creative Center — fetch trending hashtags page per country (skip IN), extract hashtags + view counts
3. Instagram via RapidAPI — daily only (check if already fetched today), use key rotation from `api_keys_pool`
4. Insert all results into `trending_topics` with 8-hour expiry
5. Cleanup: delete expired rows

### Modified: `generate-topic-suggestions`

**New input parameters:**
```typescript
{
  // existing
  interest: string,
  niches: string[],
  dnaStyles: string[],
  language: string,
  count: 6,
  country: string,
  // new
  batch: number,           // 1 = initial, 2+ = "Load More"
  exclude_titles: string[] // titles from previous batches
}
```

**New logic:**
1. Fetch 30 trending keywords from `trending_topics` WHERE country matches, not expired, ORDER BY volume_score DESC
2. Fetch last 30 days of `user_topic_history` WHERE action = 'selected'
3. Combine exclusion list: history topics + exclude_titles parameter
4. Enhanced LLM prompt with 30 trending keywords (tagged by source) + exclusion list
5. Each generated topic tagged with `trending_source`, `trending_keyword`, `hashtags[]`

**New response format:**
```typescript
{
  topics: [{
    title: string,
    description: string,
    trending_source: 'google' | 'tiktok' | 'instagram' | 'ai',
    trending_keyword: string | null,
    hashtags: string[]
  }]
}
```

---

## UI Changes: TopicSelection Screen

### Topic Card Redesign

Each card now includes:
- **Source badge** — colored pill at top (TikTok=pink/red, Google=blue, Instagram=purple, AI=gold sparkle)
- **Title** — bold, larger font
- **Description** — muted color
- **Hashtag pills** — 2-3 related hashtags at bottom
- **Hover state** — subtle scale + shadow elevation
- **Selected state** — border glow + checkmark indicator

### Load More

- Initial load: 6 topics (2x3 grid desktop, 1 column mobile)
- "Load More Topics" link/button below the grid
- Each click loads 6 more (new LLM call with exclusions)
- Max 4 batches = 24 topics per session
- Loading state: skeleton card placeholders
- Rate limiting applies to Load More clicks (shared with refresh limit)

### What Stays the Same

- Manual input option (text area for custom topic/transcript)
- Settings dropdowns: ratio, duration, language, avatar, DNA toggle
- Refresh button (regenerates current batch)
- Niche/DNA context display in header

---

## Deduplication Logic

**When user selects a topic:**
→ INSERT into `user_topic_history` (action = 'selected')

**When generating new topics:**
→ SELECT last 30 days from `user_topic_history` WHERE action = 'selected'
→ Also check `generation_sessions.topic` for additional coverage
→ Pass to LLM prompt: "Do NOT generate topics similar to these previously used topics: [list]"

**When user clicks "Load More":**
→ Frontend sends `exclude_titles` array of all currently displayed topic titles
→ Backend adds these to LLM exclusion list on top of history

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fetch-trending-data/index.ts` | **NEW** — trending data collection |
| `supabase/functions/generate-topic-suggestions/index.ts` | **MODIFY** — add trending_topics query, dedup, batch support |
| `src/screens/TopicSelection/TopicSelection.tsx` | **MODIFY** — card redesign, load more, source badges |
| `supabase/migrations/YYYYMMDD_trending_topics.sql` | **NEW** — create trending_topics + user_topic_history tables |

---

## Verification

1. **Database:** Run migration, verify tables created with correct indexes and RLS
2. **fetch-trending-data:** Call manually, verify rows inserted in `trending_topics` for all 3 sources
3. **API key rotation:** Insert test RapidAPI key, verify `get_available_api_key('rapidapi_instagram')` returns it
4. **generate-topic-suggestions:** Call with batch=1, verify topics include trending source metadata
5. **Load More:** Call with batch=2 + exclude_titles, verify no duplicates returned
6. **Dedup:** Select a topic, refresh, verify it doesn't appear again
7. **UI:** Visual check on desktop + mobile — card layout, badges, load more button, skeleton loading
8. **Country handling:** Verify IN (India) skips TikTok data, only shows Google + IG trends
