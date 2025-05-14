-- Drop existing views
DROP VIEW IF EXISTS accounts_receivable_view;
DROP VIEW IF EXISTS accounts_payable_view;

-- Create updated view for accounts receivable
CREATE VIEW accounts_receivable_view AS
SELECT 
  ar.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(ari.id) as total_installments,
  SUM(CASE WHEN ari.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  COALESCE(SUM(ari.paid_amount), 0) as total_paid_amount,
  ar.gross_amount - ar.balance as paid_amount,
  ar.balance as remaining_amount,
  MIN(CASE WHEN ari.status != 'paid' AND ari.paid_amount < ari.amount THEN ari.due_date END) as next_due_date
FROM accounts_receivable ar
JOIN partners p ON ar.partner_id = p.id
LEFT JOIN accounts_receivable_installments ari ON ar.id = ari.accounts_receivable_id
GROUP BY ar.id, p.description, p.document;

-- Create updated view for accounts payable
CREATE VIEW accounts_payable_view AS
SELECT 
  ap.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(api.id) as total_installments,
  SUM(CASE WHEN api.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  COALESCE(SUM(api.paid_amount), 0) as total_paid_amount,
  ap.gross_amount - ap.balance as paid_amount,
  ap.balance as remaining_amount,
  MIN(CASE WHEN api.status != 'paid' AND api.paid_amount < api.amount THEN api.due_date END) as next_due_date
FROM accounts_payable ap
JOIN partners p ON ap.partner_id = p.id
LEFT JOIN accounts_payable_installments api ON ap.id = api.accounts_payable_id
GROUP BY ap.id, p.description, p.document;