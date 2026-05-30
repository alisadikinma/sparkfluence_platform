-- =============================================================================
-- Sparkfluence Platform — Seed Data
-- =============================================================================
-- This file contains INSERT statements for critical lookup/config tables
-- that must be restored when migrating to a new Supabase project.
--
-- Run AFTER: baseline schema + all migrations + setup_new_project.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. api_keys_pool — API key rotation pool (CRITICAL)
-- -----------------------------------------------------------------------------
-- Providers: gemini (LLM fallback), openrouter (LLM primary), tavily (search)
-- Keys are rotated automatically; usage resets daily via cron.
-- -----------------------------------------------------------------------------

INSERT INTO api_keys_pool (id, provider, key_name, api_key, usage_count, usage_limit, limit_type, is_active, is_exhausted, priority, reset_period, notes) VALUES
('285371cd-cbb5-4191-9d4c-7af10cc736c3', 'gemini', 'aimonk.com@gmail.com', 'AIzaSyAb2tQdplE0-PbMBaWMthk1MQdaCH3mAvs', 0, 1500, 'requests', true, false, 4, 'daily', null),
('ebc0c717-2497-43c7-8e32-8fb820ddd1e1', 'gemini', 'outskill2025@gmail.com', 'AIzaSyD1kAelRyWQzetor-rG5oC-Zk8Pd6BAuOg', 0, 1500, 'requests', true, false, 3, 'daily', null),
('c678ad59-8bb0-479c-a82f-a3932b74f6d1', 'gemini', 'sparkfluence.com@gmail.com', 'AIzaSyCxQ6JbO_GGEjMR_KNSvrA0NbjsXL1t6ag', 0, 1500, 'requests', true, false, 2, 'daily', null),
('c1ad4e9a-dadb-44f2-9292-d3a9ac4c5a7e', 'gemini', 'ali.sadikincom85@gmail.com', 'AIzaSyCl226QNxQFeRKuZi3RF4X9aat9c-ORjsw', 0, 1500, 'requests', true, false, 1, 'daily', null),
('65d6d815-7c4c-4d1d-9cde-3053a1354145', 'openrouter', 'alisadikinmaai', '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', 0, 500000, 'tokens', true, false, 1, 'daily', 'paid|initial:4.76|threshold:0.95'),
('6489fedf-3b09-4779-9168-36ae8652fefe', 'tavily', 'aimonk.com', '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', 0, 1000, 'requests', true, false, 4, 'daily', null),
('360b77db-9540-4da7-a878-b8a0aa0d3c0a', 'tavily', 'sparkfluence.com', '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', 0, 1000, 'requests', true, false, 3, 'daily', null),
('5b4c5361-66dc-47aa-b37f-a4e81f038b89', 'tavily', 'alisadikinmaai', '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', 0, 1000, 'requests', true, false, 2, 'daily', null),
('5ad893d7-872f-488d-a8e0-b0ffcbe27a3f', 'tavily', 'ali.sadikincom85', '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', 0, 1000, 'requests', true, false, 1, 'daily', null);

-- -----------------------------------------------------------------------------
-- 2. lookup_master — Onboarding & classification lookups
-- -----------------------------------------------------------------------------
-- Categories: interest, objective, platform, profession
-- Used by onboarding flow and topic suggestion personalization.
-- -----------------------------------------------------------------------------

INSERT INTO lookup_master (id, category, name, created_at) VALUES
('7de4334e-9082-44be-a5af-c3ce221d9066', 'interest', 'Culinary', '2026-01-12 17:22:32.833649+00'),
('71219386-803e-4785-8966-66714d4002b2', 'interest', 'Design', '2026-01-12 17:22:32.833649+00'),
('153b8d1a-a94d-464f-af6a-dd03d4dffeb0', 'interest', 'Education', '2026-01-12 17:22:32.833649+00'),
('4bd2127a-3429-49f9-b263-e362b5aeb514', 'interest', 'Entertainment', '2026-01-12 17:22:32.833649+00'),
('cf2d947c-5eb7-4475-862d-e52402511a3a', 'interest', 'Fashion', '2026-01-12 17:22:32.833649+00'),
('34f96639-09c8-4a03-a7eb-8d031d693469', 'interest', 'Finance', '2026-01-12 17:22:32.833649+00'),
('15d73e12-fc72-4d63-bc78-354c14530093', 'interest', 'Game', '2026-01-12 17:22:32.833649+00'),
('3204a372-1c46-47b7-8ba3-54730d153d89', 'interest', 'Health', '2026-01-12 17:22:32.833649+00'),
('cf52cb76-5936-48c2-a198-9303cbf8a490', 'interest', 'Motivation', '2026-01-12 17:22:32.833649+00'),
('56d18283-0908-4e73-86d9-fb8ebd6db47a', 'interest', 'Music', '2026-01-12 17:22:32.833649+00'),
('4e1d2a4d-9d87-4551-a143-3c180175ce41', 'interest', 'Others', '2026-01-12 17:22:32.833649+00'),
('985b84b0-644c-49a4-9cfa-2604794ea5b8', 'interest', 'Technology', '2026-01-12 17:22:32.833649+00'),
('13f15e44-d961-4af3-a675-4fbfbb6e6689', 'interest', 'Travel', '2026-01-12 17:22:32.833649+00'),
('b16e2be4-d49e-4735-a9e0-e6c35b978993', 'objective', 'Consistency', '2026-01-12 17:22:32.833649+00'),
('9b9c84c8-56a0-4075-96d5-9214f8d1976c', 'objective', 'Growth', '2026-01-12 17:22:32.833649+00'),
('59deeeab-b680-4ba0-8c81-b0963e9a0eb5', 'objective', 'Monetize', '2026-01-12 17:22:32.833649+00'),
('8b24d82a-0c05-4b65-8c10-f795b663446a', 'platform', 'Instagram', '2026-01-12 17:22:32.833649+00'),
('2410ef04-d893-4d76-8ef9-44e45f0cec8d', 'platform', 'TikTok', '2026-01-12 17:22:32.833649+00'),
('2a78b346-a0d9-4a1b-a73e-b67a63d9df9a', 'platform', 'Youtube', '2026-01-12 17:22:32.833649+00'),
('aed3bf3e-e389-488f-bb37-b17a9a2fe10b', 'profession', 'Content Creator', '2026-01-12 17:22:32.833649+00'),
('76494f01-dfe5-47ff-b75d-c1839d023550', 'profession', 'Entrepreneur', '2026-01-12 17:22:32.833649+00'),
('a203dd17-1b9c-4b77-bddd-bd53443dd492', 'profession', 'Influencer', '2026-01-12 17:22:32.833649+00'),
('da5818d6-0a11-4d3b-bbc4-044c32fd05aa', 'profession', 'Marketer', '2026-01-12 17:22:32.833649+00'),
('eaeefe55-0305-4313-80af-0fa357540a66', 'profession', 'Other', '2026-01-12 17:22:32.833649+00'),
('71eb120b-735b-4b1c-8efa-e83bef7df53e', 'profession', 'Student', '2026-01-12 17:22:32.833649+00');

-- -----------------------------------------------------------------------------
-- 3. ai_model_pricing — fal.ai model catalog & pricing
-- -----------------------------------------------------------------------------
-- Categories: image, video, voice, music
-- Used by frontend cost estimator and backend model selection.
-- -----------------------------------------------------------------------------

INSERT INTO ai_model_pricing (id, category, provider, model_id, model_name, pricing_type, base_price, unit_price, unit_name, supports_image_ref, supports_voice_clone, max_duration_seconds, available_durations, is_active, is_default, display_order, notes, api_endpoint) VALUES
('27e93df6-a6f0-41b5-bbc3-f182885b85af', 'image', 'fal-ai', 'flux-pro/kontext', 'Flux Kontext Pro', 'per_image', 0.040000, null, null, true, false, null, null, true, true, 1, null, 'https://fal.ai/models/fal-ai/flux-pro/kontext'),
('4d280f73-b3cc-4a3d-82c4-5c8f186e1baa', 'image', 'fal-ai', 'nano-banana/edit', 'Nano Banana Edit', 'per_image', 0.039000, null, null, true, false, null, null, true, false, 2, null, 'https://fal.ai/models/fal-ai/nano-banana/edit'),
('b55126b9-d2b4-40f6-93e6-d21b0d1c6a93', 'image', 'fal-ai', 'bytedance/seedream/v4/text-to-image', 'Seedream v4', 'per_image', 0.030000, null, null, false, false, null, null, true, false, 3, null, 'https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image'),
('2f7c9583-7206-4e60-8bbd-77af188fb6fc', 'image', 'fal-ai', 'qwen-image', 'Qwen Image', 'per_megapixel', 0.020000, null, 'megapixel', false, false, null, null, true, false, 4, null, 'https://fal.ai/models/fal-ai/qwen-image'),
('4c64cb53-0d27-4e32-b9e7-73ff5bd0f310', 'music', 'fal-ai', 'minimax-music/v2', 'Minimax Music v2', 'per_generation', 0.030000, null, null, false, false, null, null, true, true, 1, null, 'https://fal.ai/models/fal-ai/minimax-music/v2'),
('1018b2ac-1df8-4426-99d7-d14a6d85f4d9', 'video', 'fal-ai', 'wan-25-preview/image-to-video', 'Wan 2.5 Preview', 'per_second', 0.100000, 0.050000, 'second', true, false, 10, ARRAY[5,10], true, true, 1, null, 'https://fal.ai/models/fal-ai/wan-25-preview/image-to-video'),
('3497c357-f442-46bd-8dfa-48c902df8d72', 'video', 'fal-ai', 'kling-video/v2.5-turbo/standard/image-to-video', 'Kling 2.5 Turbo', 'base_plus_unit', 0.210000, 0.042000, 'second', true, false, 10, ARRAY[5,10], true, false, 2, null, 'https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/standard/image-to-video'),
('4dd78a0c-062a-4a77-9923-1661933e36e8', 'voice', 'fal-ai', 'chatterbox/text-to-speech/turbo', 'Chatterbox TTS', 'per_character', 0.000020, null, 'character', true, false, null, null, true, true, 1, null, 'https://fal.ai/models/fal-ai/chatterbox/text-to-speech/turbo');
