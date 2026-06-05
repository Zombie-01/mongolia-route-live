DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'drivers'
      AND column_name = 'company'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN company text;
  END IF;
END $$;
