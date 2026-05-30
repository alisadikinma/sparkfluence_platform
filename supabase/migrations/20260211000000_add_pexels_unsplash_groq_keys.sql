-- ============================================================================
-- Add Pexels, Unsplash, and Groq API keys to api_keys_pool
--
-- Providers:
--   pexels   - Stock image search (PRIMARY)
--   unsplash - Stock image search (FALLBACK, requires download tracking)
--   groq     - Audio transcription (Whisper)
--
-- Run this migration AFTER filling in actual API key values.
-- Replace <PEXELS_KEY_N>, <GROQ_KEY_N>, <UNSPLASH_KEY_N> with real keys.
-- ============================================================================

-- PEXELS keys (4 accounts, 200 req/hour each)
INSERT INTO api_keys_pool (provider, key_name, api_key, usage_limit, limit_type, is_active, priority, reset_period, notes)
VALUES
  ('pexels', 'pexels_ali_sadikincom85', '<PEXELS_KEY_1>', 200, 'hourly', true, 1, 'hourly', 'Account: ali.sadikincom85 — 200 req/hour'),
  ('pexels', 'pexels_alisadikinmaai',   '<PEXELS_KEY_2>', 200, 'hourly', true, 2, 'hourly', 'Account: alisadikinmaai — 200 req/hour'),
  ('pexels', 'pexels_sparkfluence',      '<PEXELS_KEY_3>', 200, 'hourly', true, 3, 'hourly', 'Account: sparkfluence.com — 200 req/hour'),
  ('pexels', 'pexels_aimonk',            '<PEXELS_KEY_4>', 200, 'hourly', true, 4, 'hourly', 'Account: aimonk.com — 200 req/hour');

-- UNSPLASH keys (4 accounts, 50 req/hour demo mode each)
INSERT INTO api_keys_pool (provider, key_name, api_key, usage_limit, limit_type, is_active, priority, reset_period, notes)
VALUES
  ('unsplash', 'unsplash_ali_sadikincom85', '<UNSPLASH_KEY_1>', 50, 'hourly', true, 1, 'hourly', 'Account: ali.sadikincom85 — 50 req/hour (demo). Access Key only.'),
  ('unsplash', 'unsplash_alisadikinmaai',   '<UNSPLASH_KEY_2>', 50, 'hourly', true, 2, 'hourly', 'Account: alisadikinmaai — 50 req/hour (demo). Access Key only.'),
  ('unsplash', 'unsplash_sparkfluence',      '<UNSPLASH_KEY_3>', 50, 'hourly', true, 3, 'hourly', 'Account: sparkfluence.com — 50 req/hour (demo). Access Key only.'),
  ('unsplash', 'unsplash_aimonk',            '<UNSPLASH_KEY_4>', 50, 'hourly', true, 4, 'hourly', 'Account: aimonk.com — 50 req/hour (demo). Access Key only.');

-- GROQ keys (4 accounts)
INSERT INTO api_keys_pool (provider, key_name, api_key, usage_limit, limit_type, is_active, priority, reset_period, notes)
VALUES
  ('groq', 'groq_ali_sadikincom85', '<GROQ_KEY_1>', 14400, 'daily', true, 1, 'daily', 'Account: ali.sadikincom85 — Whisper transcription'),
  ('groq', 'groq_alisadikinmaai',   '<GROQ_KEY_2>', 14400, 'daily', true, 2, 'daily', 'Account: alisadikinmaai — Whisper transcription'),
  ('groq', 'groq_sparkfluence',      '<GROQ_KEY_3>', 14400, 'daily', true, 3, 'daily', 'Account: sparkfluence.com — Whisper transcription'),
  ('groq', 'groq_aimonk',            '<GROQ_KEY_4>', 14400, 'daily', true, 4, 'daily', 'Account: aimonk.com — Whisper transcription');
