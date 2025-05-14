-- Drop existing table and recreate without validations
DROP TABLE IF EXISTS partners CASCADE;

-- Create partners table without strict validations
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  person_type person_type NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  trading_name text,
  document text NOT NULL,
  email text NOT NULL,
  street text,
  street_number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'Brasil',
  phone_fixed text,
  phone_mobile text,
  whatsapp text,
  bank_name text,
  bank_agency text,
  bank_account text,
  bank_account_type account_type,
  bank_account_holder text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_partners_user_id ON partners(user_id);
CREATE INDEX idx_partners_person_type ON partners(person_type);
CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_partners_document ON partners(document);
CREATE INDEX idx_partners_bank_account_holder ON partners(bank_account_holder);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all operations for users own partners"
ON partners
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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