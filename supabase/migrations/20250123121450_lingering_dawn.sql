-- Drop existing enum type if exists
DROP TYPE IF EXISTS person_type;
DROP TYPE IF EXISTS tax_regime;

-- Create enum types
CREATE TYPE person_type AS ENUM ('individual', 'company');
CREATE TYPE tax_regime AS ENUM (
  'simple',
  'presumed',
  'real',
  'mei',
  'other'
);

-- Alter partners table to add new fields
ALTER TABLE partners ADD COLUMN IF NOT EXISTS person_type person_type;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS trading_name text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS state_registration text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS municipal_registration text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS complement text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS country text DEFAULT 'Brasil';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mobile_phone text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS secondary_emails text[];
ALTER TABLE partners ADD COLUMN IF NOT EXISTS main_contact text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_media jsonb;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS credit_limit decimal(15,2);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_agency text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_account_type text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_pix_key text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tax_regime tax_regime;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS fiscal_status text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tax_certificates jsonb;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tax_withholding jsonb;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS notes text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partners_person_type ON partners(person_type);
CREATE INDEX IF NOT EXISTS idx_partners_tax_regime ON partners(tax_regime);
CREATE INDEX IF NOT EXISTS idx_partners_document_type ON partners(type, document);