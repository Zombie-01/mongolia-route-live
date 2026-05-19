/*
  # Add trailer_plates column to drivers table

  1. Modified Tables
    - `drivers` — add `trailer_plates` column (text, nullable)
      Stores comma-separated trailer plate numbers for a truck driver.
      Example: "УБ-1234, УБ-5678"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'trailer_plates'
  ) THEN
    ALTER TABLE drivers ADD COLUMN trailer_plates text;
  END IF;
END $$;
