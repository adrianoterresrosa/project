-- Drop existing policies first to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own forecasts" ON cash_flow_forecast;
  DROP POLICY IF EXISTS "Users can create their own forecasts" ON cash_flow_forecast;
  DROP POLICY IF EXISTS "Users can update their own forecasts" ON cash_flow_forecast;
  DROP POLICY IF EXISTS "Users can delete their own forecasts" ON cash_flow_forecast;
END $$;

-- Create cash flow forecast table if it doesn't exist
CREATE TABLE IF NOT EXISTS cash_flow_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  previous_balance decimal(15,2) DEFAULT 0,
  planned_amount decimal(15,2) DEFAULT 0,
  actual_amount decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year, month, account_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecast_user_id ON cash_flow_forecast(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecast_year_month ON cash_flow_forecast(year, month);
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecast_group_id ON cash_flow_forecast(group_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecast_account_id ON cash_flow_forecast(account_id);

-- Enable RLS
ALTER TABLE cash_flow_forecast ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can view their own forecasts"
  ON cash_flow_forecast
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forecasts"
  ON cash_flow_forecast
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forecasts"
  ON cash_flow_forecast
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forecasts"
  ON cash_flow_forecast
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cash_flow_forecast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_cash_flow_forecast_timestamp ON cash_flow_forecast;
CREATE TRIGGER update_cash_flow_forecast_timestamp
  BEFORE UPDATE ON cash_flow_forecast
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_flow_forecast_updated_at();

-- Create view for cash flow forecast with group information
DROP VIEW IF EXISTS cash_flow_forecast_view;
CREATE VIEW cash_flow_forecast_view AS
SELECT
  cf.*,
  g.name as group_name,
  a.name as account_name,
  s.name as subgroup_name
FROM cash_flow_forecast cf
JOIN groups g ON cf.group_id = g.id
JOIN accounts a ON cf.account_id = a.id
JOIN subgroups s ON a.subgroup_id = s.id;