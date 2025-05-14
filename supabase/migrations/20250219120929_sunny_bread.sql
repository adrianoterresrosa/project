-- Drop existing view if exists
DROP VIEW IF EXISTS accounts_receivable_view;

-- Create updated view for accounts receivable
CREATE VIEW accounts_receivable_view AS
SELECT 
  ar.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(ari.id) as total_installments,
  SUM(CASE WHEN ari.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  COALESCE(SUM(ari.paid_amount), 0) as total_paid_amount,
  COALESCE(SUM(ari.net_amount), 0) as remaining_amount,
  MIN(CASE WHEN ari.status != 'paid' THEN ari.due_date END) as next_due_date
FROM accounts_receivable ar
JOIN partners p ON ar.partner_id = p.id
LEFT JOIN accounts_receivable_installments ari ON ar.id = ari.accounts_receivable_id
GROUP BY ar.id, p.description, p.document;