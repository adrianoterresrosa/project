-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own partners" ON partners;
DROP POLICY IF EXISTS "Users can create their own partners" ON partners;
DROP POLICY IF EXISTS "Users can update their own partners" ON partners;
DROP POLICY IF EXISTS "Users can delete their own partners" ON partners;

-- Create simplified policies
CREATE POLICY "Enable all operations for users own partners"
ON partners
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Refresh RLS
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;