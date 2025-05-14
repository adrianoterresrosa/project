-- Migrate actual entries from entries table to actual_cash_flow table
INSERT INTO actual_cash_flow (
  user_id,
  entry_date,
  account_id,
  bank_account_id,
  amount,
  description,
  created_at
)
SELECT 
  user_id,
  date::date as entry_date,
  account_id,
  bank_account_id,
  amount,
  description,
  created_at
FROM entries
WHERE type = 'actual'
ON CONFLICT DO NOTHING;

-- Create view to combine actual cash flow with account information
CREATE OR REPLACE VIEW actual_cash_flow_view AS
SELECT 
  acf.id,
  acf.user_id,
  acf.entry_date,
  acf.account_id,
  acf.bank_account_id,
  acf.amount,
  acf.description,
  acf.created_at,
  acf.updated_at,
  a.name as account_name,
  s.id as subgroup_id,
  s.name as subgroup_name,
  g.id as group_id,
  g.name as group_name,
  ba.bank_name,
  ba.account_number as bank_account_number
FROM actual_cash_flow acf
JOIN accounts a ON acf.account_id = a.id
JOIN subgroups s ON a.subgroup_id = s.id
JOIN groups g ON s.group_id = g.id
LEFT JOIN bank_accounts ba ON acf.bank_account_id = ba.id;