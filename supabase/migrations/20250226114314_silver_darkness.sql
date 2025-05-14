-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
  "theme": "light",
  "language": "pt-BR",
  "notifications": {
    "email": true,
    "push": false
  }
}'::jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_metadata ON profiles USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_profiles_settings ON profiles USING gin (settings);

-- Update RLS policies to include new columns
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

-- Update existing profiles to ensure new columns have default values
UPDATE profiles 
SET 
  status = COALESCE(status, 'active'),
  metadata = COALESCE(metadata, '{}'::jsonb),
  settings = COALESCE(settings, '{
    "theme": "light",
    "language": "pt-BR",
    "notifications": {
      "email": true,
      "push": false
    }
  }'::jsonb);