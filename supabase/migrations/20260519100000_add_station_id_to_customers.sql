-- Add station_id column to customers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'station_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN station_id uuid REFERENCES stations(id) ON DELETE SET NULL;
  END IF;
END $$;
