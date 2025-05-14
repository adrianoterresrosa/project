/*
  # Financial System Tables

  1. New Tables
    - cash_flow_entries: Stores financial transactions with planned and actual values
    - financial_metrics: Stores financial analysis metrics
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Cash Flow Entries Table
CREATE TABLE IF NOT EXISTS cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  category text NOT NULL,
  subcategory text NOT NULL,
  type text NOT NULL CHECK (type IN ('revenue', 'cost', 'expense')),
  description text NOT NULL,
  planned_amount decimal(15,2) NOT NULL,
  actual_amount decimal(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Financial Metrics Table
CREATE TABLE IF NOT EXISTS financial_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  category text NOT NULL,
  ah_percentage decimal(10,2), -- Análise Horizontal
  av_percentage decimal(10,2), -- Análise Vertical
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop cash_flow_entries policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cash_flow_entries' AND policyname = 'Users can view own entries'
  ) THEN
    DROP POLICY "Users can view own entries" ON cash_flow_entries;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cash_flow_entries' AND policyname = 'Users can insert own entries'
  ) THEN
    DROP POLICY "Users can insert own entries" ON cash_flow_entries;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cash_flow_entries' AND policyname = 'Users can update own entries'
  ) THEN
    DROP POLICY "Users can update own entries" ON cash_flow_entries;
  END IF;

  -- Drop financial_metrics policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_metrics' AND policyname = 'Users can view own metrics'
  ) THEN
    DROP POLICY "Users can view own metrics" ON financial_metrics;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_metrics' AND policyname = 'Users can insert own metrics'
  ) THEN
    DROP POLICY "Users can insert own metrics" ON financial_metrics;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Users can view own entries"
  ON cash_flow_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON cash_flow_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON cash_flow_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own metrics"
  ON financial_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
  ON financial_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_user_year_month 
  ON cash_flow_entries(user_id, year, month);

CREATE INDEX IF NOT EXISTS idx_financial_metrics_user_year_month 
  ON financial_metrics(user_id, year, month);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for cash_flow_entries
DROP TRIGGER IF EXISTS update_cash_flow_entries_updated_at ON cash_flow_entries;
CREATE TRIGGER update_cash_flow_entries_updated_at
  BEFORE UPDATE ON cash_flow_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();