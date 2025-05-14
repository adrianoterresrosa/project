-- Create enum types
CREATE TYPE person_type AS ENUM ('individual', 'company');
CREATE TYPE account_type AS ENUM ('checking', 'savings');

-- Alter partners table to add new fields
ALTER TABLE partners 
  ADD COLUMN IF NOT EXISTS person_type person_type,
  ADD COLUMN IF NOT EXISTS trading_name text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS phone_fixed text,
  ADD COLUMN IF NOT EXISTS phone_mobile text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_agency text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_account_type account_type,
  ADD COLUMN IF NOT EXISTS bank_account_holder text;