-- Add unique constraint on user_id + platform for upsert support
-- This allows only one connection per platform per user

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'linked_accounts_user_platform_unique'
  ) THEN
    ALTER TABLE linked_accounts
    ADD CONSTRAINT linked_accounts_user_platform_unique 
    UNIQUE (user_id, platform);
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_platform 
ON linked_accounts(user_id, platform);

-- Add RLS policy for linked_accounts if not exists
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies to recreate
  DROP POLICY IF EXISTS "Users can view own linked accounts" ON linked_accounts;
  DROP POLICY IF EXISTS "Users can insert own linked accounts" ON linked_accounts;
  DROP POLICY IF EXISTS "Users can update own linked accounts" ON linked_accounts;
  DROP POLICY IF EXISTS "Users can delete own linked accounts" ON linked_accounts;
  DROP POLICY IF EXISTS "Service role full access" ON linked_accounts;
  
  -- Create policies
  CREATE POLICY "Users can view own linked accounts" 
    ON linked_accounts FOR SELECT 
    USING (auth.uid() = user_id);
    
  CREATE POLICY "Users can insert own linked accounts" 
    ON linked_accounts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
  CREATE POLICY "Users can update own linked accounts" 
    ON linked_accounts FOR UPDATE 
    USING (auth.uid() = user_id);
    
  CREATE POLICY "Users can delete own linked accounts" 
    ON linked_accounts FOR DELETE 
    USING (auth.uid() = user_id);

  -- Service role bypass (for Edge Functions)
  CREATE POLICY "Service role full access" 
    ON linked_accounts FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
    
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'RLS policies may already exist: %', SQLERRM;
END $$;
