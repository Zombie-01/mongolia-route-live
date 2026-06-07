-- Add company column to shipments to store company name from UI
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS company text;
