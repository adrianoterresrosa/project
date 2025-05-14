/*
  # Financial Management System Schema

  1. New Tables
    - `groups` - Financial account groups
    - `subgroups` - Financial account subgroups
    - `accounts` - Chart of accounts
    - `transactions` - Financial transactions
    - `cash_flow` - Monthly cash flow records

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own groups"
  ON groups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Subgroups table
CREATE TABLE IF NOT EXISTS subgroups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subgroups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subgroups"
  ON subgroups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subgroups"
  ON subgroups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subgroup_id uuid REFERENCES subgroups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Financial entries table
CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  date timestamptz NOT NULL,
  amount decimal(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('planned', 'actual')),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Cash flow table
CREATE TABLE IF NOT EXISTS cash_flow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  month date NOT NULL,
  planned_amount decimal(12,2) DEFAULT 0,
  actual_amount decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cash flow"
  ON cash_flow FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cash flow"
  ON cash_flow FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subgroups_group_id ON subgroups(group_id);
CREATE INDEX IF NOT EXISTS idx_accounts_subgroup_id ON accounts(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_entries_account_id ON entries(account_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_month ON cash_flow(month);