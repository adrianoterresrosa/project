-- First, update any existing installments to remove references to payment agents that should be deleted
CREATE OR REPLACE FUNCTION safely_delete_payment_agent(agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update accounts receivable installments
  UPDATE accounts_receivable_installments
  SET payment_agent_id = NULL
  WHERE payment_agent_id = agent_id;

  -- Update accounts payable installments
  UPDATE accounts_payable_installments
  SET payment_agent_id = NULL
  WHERE payment_agent_id = agent_id;

  -- Delete the payment agent
  DELETE FROM payment_agents WHERE id = agent_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION safely_delete_payment_agent TO authenticated;

-- Create policy for payment agents
DROP POLICY IF EXISTS "Enable all operations for users own payment agents" ON payment_agents;
CREATE POLICY "Enable all operations for users own payment agents"
ON payment_agents
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Modify foreign key constraints to SET NULL on delete
ALTER TABLE accounts_receivable_installments
DROP CONSTRAINT IF EXISTS accounts_receivable_installments_payment_agent_id_fkey,
ADD CONSTRAINT accounts_receivable_installments_payment_agent_id_fkey
FOREIGN KEY (payment_agent_id)
REFERENCES payment_agents(id)
ON DELETE SET NULL;

ALTER TABLE accounts_payable_installments
DROP CONSTRAINT IF EXISTS accounts_payable_installments_payment_agent_id_fkey,
ADD CONSTRAINT accounts_payable_installments_payment_agent_id_fkey
FOREIGN KEY (payment_agent_id)
REFERENCES payment_agents(id)
ON DELETE SET NULL;