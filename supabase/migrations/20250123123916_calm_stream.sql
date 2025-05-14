-- Add bank_account_id column to entries table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entries' 
    AND column_name = 'bank_account_id'
  ) THEN
    ALTER TABLE entries ADD COLUMN bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_entries_bank_account_id'
  ) THEN
    CREATE INDEX idx_entries_bank_account_id ON entries(bank_account_id);
  END IF;
END $$;