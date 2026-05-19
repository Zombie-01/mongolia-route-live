
/*
  # Seed demo data for customers and stations

  ## Data
  - 3 demo customers (shipper, receiver, company)
  - 4 demo stations (UB locations)
*/

-- Insert demo customers
INSERT INTO public.customers (name, phone, email, company, address)
VALUES
  ('Гансүх Дөлмөө', '88011234567', 'gansuukh@example.mn', 'Логистик ХХК', 'Улаанбаатар, Чингэлтэй дүүрэг'),
  ('Батжаргал Цогов', '88012345678', 'batjargal@example.mn', 'Эмнэлэг ХХК', 'Улаанбаатар, Баянзүрх дүүрэг'),
  ('Айлчин Логистик', '88013456789', 'contact@ailchin.mn', 'Айлчин Логистик ХХК', 'Улаанбаатар, Сүхэ батор өргөн чөлөө')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.stations ADD COLUMN latitude numeric;
    ALTER TABLE public.stations ADD COLUMN longitude numeric;
  END IF;
END $$;

-- Insert demo stations
INSERT INTO public.stations (name, latitude, longitude)
VALUES
  ('Улаанбаатар Төвлөрсөн Станц', 47.9199, 106.9176),
  ('Баянзүрх Гүүр Станц', 47.9250, 106.8900),
  ('Чингэлтэй Баруун Станц', 47.8950, 106.8800),
  ('Баянзүрх Зүүн Станц', 47.9150, 107.0050)
ON CONFLICT DO NOTHING;
