-- Add gross_amount column to accounts_receivable table
ALTER TABLE accounts_receivable
ADD COLUMN gross_amount decimal(15,2);

-- Update existing records to set gross_amount equal to total_amount
UPDATE accounts_receivable
SET gross_amount = total_amount
WHERE gross_amount IS NULL;

-- Make gross_amount NOT NULL after setting initial values
ALTER TABLE accounts_receivable
ALTER COLUMN gross_amount SET NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_gross_amount 
ON accounts_receivable(gross_amount);