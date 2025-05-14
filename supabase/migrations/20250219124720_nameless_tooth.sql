-- Drop existing views
DROP VIEW IF EXISTS accounts_receivable_view;
DROP VIEW IF EXISTS accounts_payable_view;

-- Create updated view for accounts receivable with correct paid amount
CREATE VIEW accounts_receivable_view AS
SELECT 
  ar.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(ari.id) as total_installments,
  SUM(CASE WHEN ari.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  COALESCE(SUM(ari.paid_amount), 0) as total_paid_amount,
  (ar.gross_amount - ar.balance) as paid_amount,
  ar.balance as remaining_amount,
  MIN(CASE WHEN ari.status != 'paid' AND ari.paid_amount < ari.amount THEN ari.due_date END) as next_due_date,
  CASE
    WHEN ar.balance <= 0 THEN 'paid'
    WHEN ar.balance < ar.gross_amount THEN 'partial'
    ELSE 'open'
  END as status
FROM accounts_receivable ar
JOIN partners p ON ar.partner_id = p.id
LEFT JOIN accounts_receivable_installments ari ON ar.id = ari.accounts_receivable_id
GROUP BY ar.id, p.description, p.document;

-- Create updated view for accounts payable with correct paid amount
CREATE VIEW accounts_payable_view AS
SELECT 
  ap.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(api.id) as total_installments,
  SUM(CASE WHEN api.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  COALESCE(SUM(api.paid_amount), 0) as total_paid_amount,
  (ap.gross_amount - ap.balance) as paid_amount,
  ap.balance as remaining_amount,
  MIN(CASE WHEN api.status != 'paid' AND api.paid_amount < api.amount THEN api.due_date END) as next_due_date,
  CASE
    WHEN ap.balance <= 0 THEN 'paid'
    WHEN ap.balance < ap.gross_amount THEN 'partial'
    ELSE 'open'
  END as status
FROM accounts_payable ap
JOIN partners p ON ap.partner_id = p.id
LEFT JOIN accounts_payable_installments api ON ap.id = api.accounts_payable_id
GROUP BY ap.id, p.description, p.document;

-- Create function to update document balance
CREATE OR REPLACE FUNCTION update_document_balance(
  p_document_id uuid,
  p_amount numeric,
  p_table text
) RETURNS void AS $$
DECLARE
  v_balance numeric;
  v_sql text;
BEGIN
  -- Get current balance
  v_sql := format('
    SELECT balance 
    FROM %I 
    WHERE id = $1
  ', p_table);
  
  EXECUTE v_sql INTO v_balance USING p_document_id;

  -- Validate amount
  IF p_amount <= 0 OR p_amount > v_balance THEN
    RAISE EXCEPTION 'Invalid amount: must be greater than 0 and less than or equal to remaining balance';
  END IF;

  -- Update balance
  v_sql := format('
    UPDATE %I 
    SET 
      balance = balance - $1,
      updated_at = now()
    WHERE id = $2
  ', p_table);
  
  EXECUTE v_sql USING p_amount, p_document_id;

  -- Update document status
  PERFORM update_document_status(p_document_id, p_table);
END;
$$ LANGUAGE plpgsql;

-- Create function to update document status
CREATE OR REPLACE FUNCTION update_document_status(
  p_document_id uuid,
  p_table text
) RETURNS void AS $$
DECLARE
  v_balance numeric;
  v_sql text;
BEGIN
  -- Get current balance
  v_sql := format('
    SELECT balance
    FROM %I
    WHERE id = $1
  ', p_table);
  
  EXECUTE v_sql INTO v_balance USING p_document_id;
  
  -- Update document status based on balance
  v_sql := format('
    UPDATE %I
    SET status = CASE
      WHEN balance <= 0 THEN ''paid''
      WHEN balance < gross_amount THEN ''partial''
      ELSE ''open''
    END,
    updated_at = now()
    WHERE id = $1
  ', p_table);
  
  EXECUTE v_sql USING p_document_id;
END;
$$ LANGUAGE plpgsql;