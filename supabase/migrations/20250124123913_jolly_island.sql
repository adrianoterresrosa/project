-- Drop existing enum types if they exist
DROP TYPE IF EXISTS person_type CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;

-- Create enum types
CREATE TYPE person_type AS ENUM ('individual', 'company');
CREATE TYPE account_type AS ENUM ('checking', 'savings');

-- Drop existing partners table if exists
DROP TABLE IF EXISTS partners CASCADE;

-- Create partners table with validations
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  person_type person_type NOT NULL,
  type text NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
  description text NOT NULL CHECK (length(description) >= 3),
  trading_name text CHECK (
    (person_type = 'company' AND length(trading_name) >= 3) OR
    (person_type = 'individual' AND trading_name IS NULL)
  ),
  document text NOT NULL,
  email text NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  street text,
  street_number text,
  complement text,
  neighborhood text,
  city text,
  state text CHECK (state IS NULL OR length(state) = 2),
  zip_code text CHECK (zip_code IS NULL OR zip_code ~* '^\d{5}-?\d{3}$'),
  country text DEFAULT 'Brasil',
  phone_fixed text CHECK (phone_fixed IS NULL OR phone_fixed ~* '^\(\d{2}\)\s\d{4}-\d{4}$'),
  phone_mobile text CHECK (phone_mobile IS NULL OR phone_mobile ~* '^\(\d{2}\)\s\d{5}-\d{4}$'),
  whatsapp text CHECK (whatsapp IS NULL OR whatsapp ~* '^\(\d{2}\)\s\d{5}-\d{4}$'),
  bank_name text,
  bank_agency text CHECK (bank_agency IS NULL OR bank_agency ~* '^\d{1,6}(-\d{1,2})?$'),
  bank_account text CHECK (bank_account IS NULL OR bank_account ~* '^\d{1,12}(-\d{1,2})?$'),
  bank_account_type account_type,
  bank_account_holder text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_document CHECK (
    (person_type = 'individual' AND document ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$') OR
    (person_type = 'company' AND document ~* '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$')
  )
);

-- Create indexes
CREATE INDEX idx_partners_user_id ON partners(user_id);
CREATE INDEX idx_partners_person_type ON partners(person_type);
CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_partners_document ON partners(document);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own partners"
  ON partners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partners"
  ON partners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partners"
  ON partners FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partners"
  ON partners FOR DELETE
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

-- Create trigger for updated_at
CREATE TRIGGER update_partners_timestamp
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_partners_updated_at();