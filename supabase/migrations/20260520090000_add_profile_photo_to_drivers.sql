-- Add profile_photo_url and passport_photo_url columns to drivers table if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN profile_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'passport_photo_url'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN passport_photo_url text;
  END IF;
END $$;