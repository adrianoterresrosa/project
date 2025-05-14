-- Create initial balance table
CREATE TABLE IF NOT EXISTS initial_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  amount decimal(15,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE initial_balance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own initial balance"
  ON initial_balance
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own initial balance"
  ON initial_balance
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_initial_balance_user_id ON initial_balance(user_id);