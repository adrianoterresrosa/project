-- Create function to update document balance
CREATE OR REPLACE FUNCTION update_document_balance(
  p_document_id uuid,
  p_amount numeric,
  p_table text
) RETURNS void AS $$
DECLARE
  v_remaining numeric;
  v_sql text;
BEGIN
  -- Get remaining amount
  v_sql := format('
    SELECT remaining_amount 
    FROM %I_view 
    WHERE id = $1
  ', p_table);
  
  EXECUTE v_sql INTO v_remaining USING p_document_id;

  -- Validate amount
  IF p_amount <= 0 OR p_amount > v_remaining THEN
    RAISE EXCEPTION 'Invalid amount: must be greater than 0 and less than or equal to remaining amount';
  END IF;

  -- Update balance
  v_sql := format('
    UPDATE %I 
    SET balance = balance - $1
    WHERE id = $2
  ', p_table);
  
  EXECUTE v_sql USING p_amount, p_document_id;
END;
$$ LANGUAGE plpgsql;