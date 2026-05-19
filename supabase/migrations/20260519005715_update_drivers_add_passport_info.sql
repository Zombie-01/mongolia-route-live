/*
  # Add Passport and Contact Info to Drivers Table

  1. Changes
    - Add passport_image (text) for passport image URL/data
    - Add account_number (text) for bank account details
    - Add mongolia_phone (text) for Mongolia phone number
    - Add russia_phone (text) for Russia phone number

  2. Notes
    - All new columns are optional
    - Enables full driver profile management
    - Passport image can store URL or base64 data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'passport_image'
  ) THEN
    ALTER TABLE drivers ADD COLUMN passport_image text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE drivers ADD COLUMN account_number text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'mongolia_phone'
  ) THEN
    ALTER TABLE drivers ADD COLUMN mongolia_phone text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'russia_phone'
  ) THEN
    ALTER TABLE drivers ADD COLUMN russia_phone text;
  END IF;
END $$;
