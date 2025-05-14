-- Drop columns from partners table
ALTER TABLE partners 
  DROP COLUMN IF EXISTS person_type,
  DROP COLUMN IF EXISTS trading_name,
  DROP COLUMN IF EXISTS state_registration,
  DROP COLUMN IF EXISTS municipal_registration,
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS street_number,
  DROP COLUMN IF EXISTS complement,
  DROP COLUMN IF EXISTS neighborhood,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS zip_code,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS mobile_phone,
  DROP COLUMN IF EXISTS whatsapp,
  DROP COLUMN IF EXISTS secondary_emails,
  DROP COLUMN IF EXISTS main_contact,
  DROP COLUMN IF EXISTS social_media,
  DROP COLUMN IF EXISTS payment_terms,
  DROP COLUMN IF EXISTS credit_limit,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_agency,
  DROP COLUMN IF EXISTS bank_account,
  DROP COLUMN IF EXISTS bank_account_type,
  DROP COLUMN IF EXISTS bank_pix_key,
  DROP COLUMN IF EXISTS tax_regime,
  DROP COLUMN IF EXISTS fiscal_status,
  DROP COLUMN IF EXISTS tax_certificates,
  DROP COLUMN IF EXISTS tax_withholding,
  DROP COLUMN IF EXISTS notes;

-- Drop enum types if they exist
DROP TYPE IF EXISTS person_type;
DROP TYPE IF EXISTS tax_regime;