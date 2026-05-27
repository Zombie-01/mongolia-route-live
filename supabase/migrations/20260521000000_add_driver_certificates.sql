/*
  # Add vehicle and trailer certificate URLs to drivers table

  1. New Columns
    - `vehicle_cert_url` (text) - Тээврийн хэрэгслийн гэрчилгээний зураг/файл
    - `trailer_cert_url` (text) - Чиргүүлийн гэрчилгээний зураг/файл

  2. Notes
    - Both columns are optional
    - Store public URLs to uploaded files in storage buckets
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'vehicle_cert_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN vehicle_cert_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'trailer_cert_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN trailer_cert_url text;
  END IF;
END $$;
