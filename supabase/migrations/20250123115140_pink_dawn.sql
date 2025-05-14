/*
  # Bank Accounts Management Schema

  1. New Tables
    - `bank_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `bank_code` (text)
      - `bank_name` (text)
      - `account_type` (enum)
      - `agency_number` (text)
      - `agency_name` (text)
      - `account_number` (text)
      - `initial_balance` (decimal)
      - `status` (enum)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `bank_accounts` table
    - Add policies for authenticated users
*/

-- Create enum types
CREATE TYPE bank_account_type AS ENUM (
  'checking',
  'investment',
  'savings',
  'physical'
);

CREATE TYPE bank_account_status AS ENUM (
  'active',
  'inactive',
  'closed'
);

-- Create bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bank_code text NOT NULL,
  bank_name text NOT NULL,
  account_type bank_account_type NOT NULL,
  agency_number text,
  agency_name text,
  account_number text,
  initial_balance decimal(15,2) NOT NULL DEFAULT 0,
  status bank_account_status NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_status ON bank_accounts(status);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bank accounts"
  ON bank_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bank accounts"
  ON bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
  ON bank_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
  ON bank_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_bank_accounts_timestamp
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_accounts_updated_at();