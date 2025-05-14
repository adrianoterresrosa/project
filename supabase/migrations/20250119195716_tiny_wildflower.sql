/*
  # Cash Flow Management Schema

  1. New Tables
    - `cash_flow_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `year` (integer)
      - `month` (integer)
      - `type` (text: revenue, cost, expense)
      - `category` (text)
      - `description` (text)
      - `planned_amount` (decimal)
      - `actual_amount` (decimal)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `cash_flow_entries`
    - Add policies for authenticated users to manage their own entries
*/

-- Create cash flow entries table
CREATE TABLE IF NOT EXISTS cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  type text NOT NULL CHECK (type IN ('revenue', 'cost', 'expense')),
  category text NOT NULL,
  description text NOT NULL,
  planned_amount decimal(12,2) NOT NULL,
  actual_amount decimal(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own entries"
  ON cash_flow_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON cash_flow_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON cash_flow_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON cash_flow_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_user_id ON cash_flow_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_year_month ON cash_flow_entries(year, month);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_type ON cash_flow_entries(type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_cash_flow_entries_updated_at
  BEFORE UPDATE ON cash_flow_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();