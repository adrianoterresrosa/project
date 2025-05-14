-- Add bank_account_holder column to partners table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' 
    AND column_name = 'bank_account_holder'
  ) THEN
    ALTER TABLE partners ADD COLUMN bank_account_holder text;
  END IF;
END $$;

-- Refresh RLS
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Recreate the policy
DROP POLICY IF EXISTS "Enable all operations for users own partners" ON partners;
CREATE POLICY "Enable all operations for users own partners"
ON partners
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);