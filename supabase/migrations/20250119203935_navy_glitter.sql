-- First, create a temporary table to store the latest settings for each user
CREATE TEMP TABLE latest_settings AS
SELECT DISTINCT ON (user_id)
  id,
  user_id,
  settings,
  created_at,
  updated_at
FROM user_settings
ORDER BY user_id, updated_at DESC;

-- Delete all rows from user_settings
DELETE FROM user_settings;

-- Reinsert only the latest settings for each user
INSERT INTO user_settings (id, user_id, settings, created_at, updated_at)
SELECT id, user_id, settings, created_at, updated_at
FROM latest_settings;

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_settings_user_id_key'
  ) THEN
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;