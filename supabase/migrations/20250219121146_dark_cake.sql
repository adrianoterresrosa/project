-- Add balance and gross_amount columns to accounts_payable table
ALTER TABLE accounts_payable
ADD COLUMN balance decimal(15,2) NOT NULL DEFAULT 0,
ADD COLUMN gross_amount decimal(15,2);

-- Update existing records to set gross_amount equal to total_amount
UPDATE accounts_payable
SET gross_amount = total_amount
WHERE gross_amount IS NULL;

-- Make gross_amount NOT NULL after setting initial values
ALTER TABLE accounts_payable
ALTER COLUMN gross_amount SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_payable_balance 
ON accounts_payable(balance);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_gross_amount 
ON accounts_payable(gross_amount);

-- Drop existing view if exists
DROP VIEW IF EXISTS accounts_payable_view;

-- Create updated view for accounts payable
CREATE VIEW accounts_payable_view AS
SELECT 
  ap.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(api.id) as total_installments,
  SUM(CASE WHEN api.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  COALESCE(SUM(api.paid_amount), 0) as total_paid_amount,
  COALESCE(SUM(api.net_amount), 0) as remaining_amount,
  MIN(CASE WHEN api.status != 'paid' THEN api.due_date END) as next_due_date
FROM accounts_payable ap
JOIN partners p ON ap.partner_id = p.id
LEFT JOIN accounts_payable_installments api ON ap.id = api.accounts_payable_id
GROUP BY ap.id, p.description, p.document;