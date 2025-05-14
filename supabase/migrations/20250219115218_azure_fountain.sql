-- Add balance column to accounts_receivable table
ALTER TABLE accounts_receivable
ADD COLUMN balance decimal(15,2) NOT NULL DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_balance 
ON accounts_receivable(balance);

-- Update existing records to calculate balance
UPDATE accounts_receivable ar
SET balance = (
  SELECT COALESCE(SUM(net_amount), 0)
  FROM accounts_receivable_installments
  WHERE accounts_receivable_id = ar.id
);