/*
  # Update Stations Table to Add Separate Lat/Lng

  1. Changes
    - Add latitude and longitude columns (parsed from position JSONB)
    - Backfill data from existing position field
    - Keep position for backward compatibility

  2. Notes
    - Enables simpler queries and map interactions
    - Position will contain [latitude, longitude] as before
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE stations ADD COLUMN latitude float;
    ALTER TABLE stations ADD COLUMN longitude float;
  END IF;
END $$;

-- Backfill coordinates from existing position data
UPDATE stations
SET 
  latitude = COALESCE((position->0)::float, 47.9),
  longitude = COALESCE((position->1)::float, 106.9)
WHERE latitude IS NULL;

-- Add default values for new columns
ALTER TABLE stations ALTER COLUMN latitude SET DEFAULT 47.9;
ALTER TABLE stations ALTER COLUMN longitude SET DEFAULT 106.9;
