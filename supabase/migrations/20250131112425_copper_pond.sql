-- Create actual cash flow entries table
CREATE TABLE IF NOT EXISTS actual_cash_flow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  entry_date date NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  amount decimal(15,2) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_actual_cash_flow_user_id ON actual_cash_flow(user_id);
CREATE INDEX idx_actual_cash_flow_entry_date ON actual_cash_flow(entry_date);
CREATE INDEX idx_actual_cash_flow_account_id ON actual_cash_flow(account_id);
CREATE INDEX idx_actual_cash_flow_bank_account_id ON actual_cash_flow(bank_account_id);

-- Enable RLS
ALTER TABLE actual_cash_flow ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own actual cash flow"
  ON actual_cash_flow
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own actual cash flow"
  ON actual_cash_flow
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actual cash flow"
  ON actual_cash_flow
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own actual cash flow"
  ON actual_cash_flow
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_actual_cash_flow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_actual_cash_flow_timestamp
  BEFORE UPDATE ON actual_cash_flow
  FOR EACH ROW
  EXECUTE FUNCTION update_actual_cash_flow_updated_at();