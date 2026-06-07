-- Drop company column from drivers (migrated to shipments.company)
ALTER TABLE public.drivers
  DROP COLUMN IF EXISTS company;
