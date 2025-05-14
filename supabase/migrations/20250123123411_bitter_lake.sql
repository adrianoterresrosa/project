-- Add bank_account_id column to entries table
ALTER TABLE entries ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_entries_bank_account_id ON entries(bank_account_id);

-- Add bank_account_id to entries type
ALTER TABLE entries ALTER COLUMN bank_account_id DROP NOT NULL;