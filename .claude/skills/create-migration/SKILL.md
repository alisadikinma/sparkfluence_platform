---
name: create-migration
description: Create a new Supabase migration following project naming conventions
disable-model-invocation: true
---

# Create Migration

Create a new Supabase SQL migration file following the project's naming conventions.

## Usage

```
/create-migration <description_in_snake_case>
```

## Naming Convention

File: `supabase/migrations/YYYYMMDDHHMMSS_<description>.sql`

- Timestamp format: `YYYYMMDDHHMMSS` (use current UTC time with `000000` for time if unsure)
- Description: `snake_case`, descriptive of the change

## Database Naming Conventions

Follow these patterns from the project standards:

| Type | Pattern | Example |
|------|---------|---------|
| Table | `snake_case` | `video_jobs` |
| Trigger | `trg_{table}_set_updated_at` | `trg_video_jobs_set_updated_at` |
| Trigger Function | `trg_fn_{table}_set_updated_at()` | `trg_fn_video_jobs_set_updated_at()` |
| Index | `idx_{table}_{column}` | `idx_video_jobs_user_id` |
| RLS Policy | `{action}_{role}_{table}` | `select_authenticated_video_jobs` |

## Migration Template

Every migration should include:

```sql
-- Description: <what this migration does>

-- 1. Table/column changes
-- ...

-- 2. Indexes (if needed)
-- CREATE INDEX idx_{table}_{column} ON {table}({column});

-- 3. RLS Policies (if new table)
-- ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "select_authenticated_{table}" ON {table}
--   FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Triggers (if table needs updated_at)
-- CREATE OR REPLACE FUNCTION trg_fn_{table}_set_updated_at()
-- RETURNS TRIGGER AS $$ BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END; $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_{table}_set_updated_at
--   BEFORE UPDATE ON {table}
--   FOR EACH ROW EXECUTE FUNCTION trg_fn_{table}_set_updated_at();
```

## Workflow

1. Generate the timestamp from current UTC date
2. Create the migration file with the naming convention
3. Add the SQL content following the template above
4. Remind the user to review the migration before applying with `supabase db push`

## Important

- NEVER run `supabase db push` automatically — always ask the user first
- Always include RLS policies for new tables
- Always add `updated_at` triggers for tables that have an `updated_at` column
- Check existing migrations in `supabase/migrations/` to avoid conflicts
