-- Add bank_account_holder column to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_account_holder text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_partners_bank_account_holder ON partners(bank_account_holder);

-- Refresh RLS to ensure policies are up to date
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