-- First drop the view if it exists
DROP VIEW IF EXISTS entries_with_relations CASCADE;

-- Create a temporary table to store existing entries data
CREATE TEMP TABLE temp_entries AS SELECT * FROM entries;

-- Drop the existing entries table
DROP TABLE entries CASCADE;

-- Recreate the entries table with all columns
CREATE TABLE entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  date timestamptz NOT NULL,
  amount decimal(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('planned', 'actual')),
  description text,
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  accounts_receivable_id uuid REFERENCES accounts_receivable(id) ON DELETE SET NULL,
  accounts_payable_id uuid REFERENCES accounts_payable(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT entries_single_relation_check
  CHECK (
    (accounts_receivable_id IS NULL AND accounts_payable_id IS NULL) OR
    (accounts_receivable_id IS NOT NULL AND accounts_payable_id IS NULL) OR
    (accounts_receivable_id IS NULL AND accounts_payable_id IS NOT NULL)
  )
);

-- Restore the data
INSERT INTO entries (
  id, user_id, account_id, date, amount, type, description, 
  bank_account_id, created_at
)
SELECT 
  id, user_id, account_id, date, amount, type, description, 
  bank_account_id, created_at
FROM temp_entries;

-- Drop temporary table
DROP TABLE temp_entries;

-- Create indexes for better performance
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_account_id ON entries(account_id);
CREATE INDEX idx_entries_date ON entries(date);
CREATE INDEX idx_entries_bank_account_id ON entries(bank_account_id);
CREATE INDEX idx_entries_accounts_receivable_id ON entries(accounts_receivable_id);
CREATE INDEX idx_entries_accounts_payable_id ON entries(accounts_payable_id);

-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own entries"
  ON entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries"
  ON entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create view for entries with relations
CREATE VIEW entries_with_relations AS
SELECT 
  e.*,
  ar.document_number as receivable_document,
  ar.description as receivable_description,
  p_rec.description as customer_name,
  ap.document_number as payable_document,
  ap.description as payable_description,
  p_pay.description as supplier_name
FROM entries e
LEFT JOIN accounts_receivable ar ON e.accounts_receivable_id = ar.id
LEFT JOIN partners p_rec ON ar.partner_id = p_rec.id
LEFT JOIN accounts_payable ap ON e.accounts_payable_id = ap.id
LEFT JOIN partners p_pay ON ap.partner_id = p_pay.id;

-- Enable RLS on the view
ALTER VIEW entries_with_relations OWNER TO postgres;
GRANT SELECT ON entries_with_relations TO authenticated;