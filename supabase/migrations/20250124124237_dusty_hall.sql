-- Drop existing table and recreate with simpler validations
DROP TABLE IF EXISTS partners CASCADE;

-- Create partners table with minimal validations
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  person_type person_type NOT NULL,
  type text NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
  description text NOT NULL,
  trading_name text,
  document text NOT NULL CHECK (
    document ~ '^\d{2,3}\.?\d{3}\.?\d{3}[-/]?\d{4}?[-]?\d{2}$'
  ),
  email text NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  street text,
  street_number text,
  complement text,
  neighborhood text,
  city text,
  state text CHECK (state IS NULL OR length(state) = 2),
  zip_code text CHECK (zip_code IS NULL OR zip_code ~ '^\d{5}-?\d{3}$'),
  country text DEFAULT 'Brasil',
  phone_fixed text CHECK (phone_fixed IS NULL OR phone_fixed ~ '^\(\d{2}\)\s?\d{4}-?\d{4}$'),
  phone_mobile text CHECK (phone_mobile IS NULL OR phone_mobile ~ '^\(\d{2}\)\s?\d{5}-?\d{4}$'),
  whatsapp text CHECK (whatsapp IS NULL OR whatsapp ~ '^\(\d{2}\)\s?\d{5}-?\d{4}$'),
  bank_name text,
  bank_agency text CHECK (bank_agency IS NULL OR bank_agency ~ '^\d{1,6}(-\d{1,2})?$'),
  bank_account text CHECK (bank_account IS NULL OR bank_account ~ '^\d{1,12}(-\d{1,2})?$'),
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