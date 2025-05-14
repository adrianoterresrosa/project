-- Add contact_info column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_contact_info ON profiles USING gin (contact_info);

-- Update RLS policies to include contact_info
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Update existing profiles to ensure contact_info is not null
UPDATE profiles 
SET contact_info = '{}'::jsonb 
WHERE contact_info IS NULL;