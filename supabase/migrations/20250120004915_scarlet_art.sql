/*
  # Create Partners Table

  1. New Tables
    - `partners`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `number` (text)
      - `email` (text)
      - `description` (text)
      - `document` (text)
      - `phone` (text)
      - `type` (enum: customer, supplier, both)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `partners` table
    - Add policies for authenticated users to manage their own partners
*/

-- Create enum type for partner types
CREATE TYPE partner_type AS ENUM ('customer', 'supplier', 'both');

-- Create partners table
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  number text NOT NULL,
  email text NOT NULL,
  description text NOT NULL,
  document text NOT NULL,
  phone text NOT NULL,
  type partner_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_created_at ON partners(created_at);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own partners"
  ON partners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partners"
  ON partners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partners"
  ON partners
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partners"
  ON partners
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_partners_timestamp
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_partners_updated_at();