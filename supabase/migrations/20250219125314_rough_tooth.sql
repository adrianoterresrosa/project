-- First drop existing views if they exist
DROP VIEW IF EXISTS entries_with_relations CASCADE;

-- Add missing columns to entries table
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS accounts_receivable_id uuid REFERENCES accounts_receivable(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS accounts_payable_id uuid REFERENCES accounts_payable(id) ON DELETE SET NULL;

-- Add constraint to ensure only one document relationship
ALTER TABLE entries
ADD CONSTRAINT entries_single_document_check
CHECK (
  (accounts_receivable_id IS NULL AND accounts_payable_id IS NULL) OR
  (accounts_receivable_id IS NOT NULL AND accounts_payable_id IS NULL) OR
  (accounts_receivable_id IS NULL AND accounts_payable_id IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entries_accounts_receivable_id ON entries(accounts_receivable_id);
CREATE INDEX IF NOT EXISTS idx_entries_accounts_payable_id ON entries(accounts_payable_id);

-- Create view for entries with document relationships
CREATE VIEW entries_with_relations AS
SELECT 
  e.id,
  e.user_id,
  e.account_id,
  e.date,
  e.amount,
  e.type,
  e.description,
  e.bank_account_id,
  e.partner_id,
  e.accounts_receivable_id,
  e.accounts_payable_id,
  e.created_at,
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

-- Create function to handle entry document updates
CREATE OR REPLACE FUNCTION handle_entry_document_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update receivable balance if applicable
  IF NEW.accounts_receivable_id IS NOT NULL THEN
    PERFORM update_document_balance(NEW.accounts_receivable_id, NEW.amount, 'accounts_receivable');
  END IF;

  -- Update payable balance if applicable
  IF NEW.accounts_payable_id IS NOT NULL THEN
    PERFORM update_document_balance(NEW.accounts_payable_id, NEW.amount, 'accounts_payable');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for entries
DROP TRIGGER IF EXISTS entry_document_update ON entries;
CREATE TRIGGER entry_document_update
  AFTER INSERT OR UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_entry_document_update();