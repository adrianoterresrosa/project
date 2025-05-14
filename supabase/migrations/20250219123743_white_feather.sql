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
  ap.balance as remaining_amount,
  MIN(CASE WHEN api.status != 'paid' AND api.paid_amount < api.amount THEN api.due_date END) as next_due_date
FROM accounts_payable ap
JOIN partners p ON ap.partner_id = p.id
LEFT JOIN accounts_payable_installments api ON ap.id = api.accounts_payable_id
GROUP BY ap.id, p.description, p.document;

-- Create function to update installment payment
CREATE OR REPLACE FUNCTION update_installment_payment(
  p_document_id uuid,
  p_amount numeric,
  p_table text
) RETURNS void AS $$
DECLARE
  v_installment_id uuid;
  v_installment_amount numeric;
  v_paid_amount numeric;
  v_sql text;
BEGIN
  -- Get the first unpaid or partially paid installment
  v_sql := format('
    SELECT id, amount, COALESCE(paid_amount, 0)
    FROM %I_installments
    WHERE %I_id = $1
      AND (status = ''open'' OR status = ''partial'')
    ORDER BY installment_number
    LIMIT 1
  ', p_table, p_table);
  
  EXECUTE v_sql INTO v_installment_id, v_installment_amount, v_paid_amount
  USING p_document_id;

  IF v_installment_id IS NULL THEN
    RAISE EXCEPTION 'No unpaid installments found';
  END IF;

  -- Calculate remaining amount for this installment
  v_installment_amount := v_installment_amount - v_paid_amount;
  
  IF p_amount > v_installment_amount THEN
    RAISE EXCEPTION 'Payment amount exceeds installment remaining amount';
  END IF;

  -- Update installment
  v_sql := format('
    UPDATE %I_installments
    SET paid_amount = COALESCE(paid_amount, 0) + $1,
        status = CASE 
          WHEN COALESCE(paid_amount, 0) + $1 >= amount THEN ''paid''
          WHEN COALESCE(paid_amount, 0) + $1 > 0 THEN ''partial''
          ELSE status
        END,
        paid_date = CASE 
          WHEN COALESCE(paid_amount, 0) = 0 THEN now()
          ELSE paid_date
        END
    WHERE id = $2
  ', p_table);
  
  EXECUTE v_sql USING p_amount, v_installment_id;

  -- Update document balance
  v_sql := format('
    UPDATE %I
    SET balance = balance - $1
    WHERE id = $2
  ', p_table);
  
  EXECUTE v_sql USING p_amount, p_document_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update document status
CREATE OR REPLACE FUNCTION update_document_status(
  p_document_id uuid,
  p_table text
) RETURNS void AS $$
DECLARE
  v_total_amount numeric;
  v_paid_amount numeric;
  v_sql text;
BEGIN
  -- Get total and paid amounts
  v_sql := format('
    SELECT 
      d.gross_amount,
      COALESCE(SUM(i.paid_amount), 0)
    FROM %I d
    LEFT JOIN %I_installments i ON i.%I_id = d.id
    WHERE d.id = $1
    GROUP BY d.id, d.gross_amount
  ', p_table, p_table, p_table);
  
  EXECUTE v_sql INTO v_total_amount, v_paid_amount
  USING p_document_id;
  
  -- Update document status based on paid amount
  v_sql := format('
    UPDATE %I
    SET status = CASE
      WHEN $1 >= $2 THEN ''paid''
      WHEN $1 > 0 THEN ''partial''
      ELSE ''open''
    END
    WHERE id = $3
  ', p_table);
  
  EXECUTE v_sql USING v_paid_amount, v_total_amount, p_document_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for entries
CREATE OR REPLACE FUNCTION handle_entry_document_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update receivable status if applicable
  IF NEW.accounts_receivable_id IS NOT NULL THEN
    PERFORM update_document_status(NEW.accounts_receivable_id, 'accounts_receivable');
  END IF;

  -- Update payable status if applicable
  IF NEW.accounts_payable_id IS NOT NULL THEN
    PERFORM update_document_status(NEW.accounts_payable_id, 'accounts_payable');
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