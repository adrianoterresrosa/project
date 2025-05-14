-- First drop the view if it exists
DROP VIEW IF EXISTS entries_with_relations CASCADE;

-- Then drop the existing foreign key constraints if they exist
ALTER TABLE entries 
  DROP CONSTRAINT IF EXISTS entries_accounts_receivable_id_fkey,
  DROP CONSTRAINT IF EXISTS entries_accounts_payable_id_fkey;

-- Drop the columns if they exist
ALTER TABLE entries 
  DROP COLUMN IF EXISTS accounts_receivable_id,
  DROP COLUMN IF EXISTS accounts_payable_id;

-- Add the columns back with proper foreign key constraints
ALTER TABLE entries
  ADD COLUMN accounts_receivable_id uuid REFERENCES accounts_receivable(id) ON DELETE SET NULL,
  ADD COLUMN accounts_payable_id uuid REFERENCES accounts_payable(id) ON DELETE SET NULL;

-- Add constraint to ensure only one relation can be set
ALTER TABLE entries
  ADD CONSTRAINT entries_single_relation_check
  CHECK (
    (accounts_receivable_id IS NULL AND accounts_payable_id IS NULL) OR
    (accounts_receivable_id IS NOT NULL AND accounts_payable_id IS NULL) OR
    (accounts_receivable_id IS NULL AND accounts_payable_id IS NOT NULL)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entries_accounts_receivable_id ON entries(accounts_receivable_id);
CREATE INDEX IF NOT EXISTS idx_entries_accounts_payable_id ON entries(accounts_payable_id);

-- Recreate view for entries with relations
CREATE OR REPLACE VIEW entries_with_relations AS
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