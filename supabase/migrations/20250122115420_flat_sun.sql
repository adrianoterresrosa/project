-- Drop existing objects if they exist
DO $$ 
BEGIN
  -- Drop indexes if they exist
  DROP INDEX IF EXISTS idx_cost_centers_user_id;
  DROP INDEX IF EXISTS idx_account_cost_centers_account_id;
  DROP INDEX IF EXISTS idx_account_cost_centers_cost_center_id;
  DROP INDEX IF EXISTS idx_entry_cost_centers_entry_id;
  DROP INDEX IF EXISTS idx_entry_cost_centers_cost_center_id;

  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own cost centers" ON cost_centers;
  DROP POLICY IF EXISTS "Users can create their own cost centers" ON cost_centers;
  DROP POLICY IF EXISTS "Users can update their own cost centers" ON cost_centers;
  DROP POLICY IF EXISTS "Users can delete their own cost centers" ON cost_centers;
  DROP POLICY IF EXISTS "Users can view their own account cost centers" ON account_cost_centers;
  DROP POLICY IF EXISTS "Users can manage their own account cost centers" ON account_cost_centers;
  DROP POLICY IF EXISTS "Users can view their own entry cost centers" ON entry_cost_centers;
  DROP POLICY IF EXISTS "Users can manage their own entry cost centers" ON entry_cost_centers;

  -- Drop trigger if exists
  DROP TRIGGER IF EXISTS update_cost_centers_timestamp ON cost_centers;
  
  -- Drop function if exists
  DROP FUNCTION IF EXISTS update_cost_centers_updated_at();
END $$;

-- Create cost centers table if not exists
CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create account cost centers table for N:M relationship
CREATE TABLE IF NOT EXISTS account_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE CASCADE NOT NULL,
  percentage decimal(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, cost_center_id)
);

-- Add cost center allocation table for entries
CREATE TABLE IF NOT EXISTS entry_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE CASCADE NOT NULL,
  percentage decimal(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  amount decimal(15,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(entry_id, cost_center_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cost_centers_user_id ON cost_centers(user_id);
CREATE INDEX IF NOT EXISTS idx_account_cost_centers_account_id ON account_cost_centers(account_id);
CREATE INDEX IF NOT EXISTS idx_account_cost_centers_cost_center_id ON account_cost_centers(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_entry_cost_centers_entry_id ON entry_cost_centers(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_cost_centers_cost_center_id ON entry_cost_centers(cost_center_id);

-- Enable RLS
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_cost_centers ENABLE ROW LEVEL SECURITY;

-- Create policies for cost_centers
CREATE POLICY "Users can view their own cost centers"
  ON cost_centers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cost centers"
  ON cost_centers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cost centers"
  ON cost_centers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cost centers"
  ON cost_centers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for account_cost_centers
CREATE POLICY "Users can view their own account cost centers"
  ON account_cost_centers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = account_id
      AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own account cost centers"
  ON account_cost_centers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = account_id
      AND a.user_id = auth.uid()
    )
  );

-- Create policies for entry_cost_centers
CREATE POLICY "Users can view their own entry cost centers"
  ON entry_cost_centers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entries e
      WHERE e.id = entry_id
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own entry cost centers"
  ON entry_cost_centers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entries e
      WHERE e.id = entry_id
      AND e.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cost_centers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_cost_centers_timestamp
  BEFORE UPDATE ON cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION update_cost_centers_updated_at();

-- Create view for cost center totals
CREATE OR REPLACE VIEW cost_center_totals AS
SELECT
  cc.id as cost_center_id,
  cc.name as cost_center_name,
  cc.user_id,
  COALESCE(SUM(ecc.amount), 0) as total_amount
FROM cost_centers cc
LEFT JOIN entry_cost_centers ecc ON cc.id = ecc.cost_center_id
GROUP BY cc.id, cc.name, cc.user_id;