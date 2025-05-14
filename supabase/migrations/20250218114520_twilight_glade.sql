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
  partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
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
CREATE INDEX idx_entries_partner_id ON entries(partner_id);

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
  p.description as partner_name,
  p.type as partner_type,
  CASE 
    WHEN p.type = 'customer' OR p.type = 'both' THEN p.description
    ELSE NULL
  END as customer_name,
  CASE 
    WHEN p.type = 'supplier' OR p.type = 'both' THEN p.description
    ELSE NULL
  END as supplier_name
FROM entries e
LEFT JOIN partners p ON e.partner_id = p.id;

-- Enable RLS on the view
ALTER VIEW entries_with_relations OWNER TO postgres;
GRANT SELECT ON entries_with_relations TO authenticated;