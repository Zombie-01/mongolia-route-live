
/*
  # Create core business tables: customers, stations, drivers, shipments

  ## New Tables

  ### customers
  - id, name, phone, email, company, address
  - For tracking shipping partners (senders/receivers)

  ### stations  
  - id, name, latitude, longitude
  - Pickup/delivery locations (replaces static demo data)

  ### drivers
  - id, user_id, phone, vehicle_license_plate, passport_photo_url, trailer_numbers (jsonb)
  - Vehicle type is always 'car' per requirements

  ### shipments
  - id, shipper_id (customer), receiver_id (customer), pickup_station_id, delivery_station_id
  - status, progress, created_at, updated_at

  ### stops
  - id, shipment_id, station_id, sequence, status, created_at

  ## Security
  - All tables: RLS enabled
  - customers: all authenticated read, admin write
  - stations: all authenticated read, admin write  
  - drivers: all authenticated read, admin write
  - shipments: visible to involved parties and admins
  - stops: visible to involved parties and admins
*/

-- -----------------------------------------------------------------------
-- Create customers table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  company text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_all" ON public.customers;
CREATE POLICY "customers_select_all"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "customers_insert_admin" ON public.customers;
CREATE POLICY "customers_insert_admin"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "customers_update_admin" ON public.customers;
CREATE POLICY "customers_update_admin"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "customers_delete_admin" ON public.customers;
CREATE POLICY "customers_delete_admin"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- -----------------------------------------------------------------------
-- Create stations table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stations_select_all" ON public.stations;
CREATE POLICY "stations_select_all"
  ON public.stations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "stations_insert_admin" ON public.stations;
CREATE POLICY "stations_insert_admin"
  ON public.stations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "stations_update_admin" ON public.stations;
CREATE POLICY "stations_update_admin"
  ON public.stations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "stations_delete_admin" ON public.stations;
CREATE POLICY "stations_delete_admin"
  ON public.stations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- -----------------------------------------------------------------------
-- Create drivers table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  vehicle_license_plate text NOT NULL UNIQUE,
  passport_photo_url text,
  trailer_numbers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_select_all" ON public.drivers;
CREATE POLICY "drivers_select_all"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "drivers_insert_admin" ON public.drivers;
CREATE POLICY "drivers_insert_admin"
  ON public.drivers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "drivers_update_admin" ON public.drivers;
CREATE POLICY "drivers_update_admin"
  ON public.drivers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "drivers_delete_admin" ON public.drivers;
CREATE POLICY "drivers_delete_admin"
  ON public.drivers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- -----------------------------------------------------------------------
-- Create shipments table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id uuid NOT NULL REFERENCES public.customers(id),
  receiver_id uuid NOT NULL REFERENCES public.customers(id),
  pickup_station_id uuid NOT NULL REFERENCES public.stations(id),
  delivery_station_id uuid NOT NULL REFERENCES public.stations(id),
  status text DEFAULT 'pending',
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shipments_select_authenticated" ON public.shipments;
CREATE POLICY "shipments_select_authenticated"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "shipments_insert_admin" ON public.shipments;
CREATE POLICY "shipments_insert_admin"
  ON public.shipments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "shipments_update_admin" ON public.shipments;
CREATE POLICY "shipments_update_admin"
  ON public.shipments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "shipments_delete_admin" ON public.shipments;
CREATE POLICY "shipments_delete_admin"
  ON public.shipments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'shipper_id'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN shipper_id uuid REFERENCES public.customers(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'receiver_id'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN receiver_id uuid REFERENCES public.customers(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'pickup_station_id'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN pickup_station_id uuid REFERENCES public.stations(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'delivery_station_id'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN delivery_station_id uuid REFERENCES public.stations(id);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Create stops table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES public.stations(id),
  sequence integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stops_select_authenticated"
  ON public.stops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stops_insert_admin"
  ON public.stops FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "stops_update_admin"
  ON public.stops FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "stops_delete_admin"
  ON public.stops FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stops' AND column_name = 'station_id'
  ) THEN
    ALTER TABLE public.stops ADD COLUMN station_id uuid REFERENCES public.stations(id);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Create indexes for performance
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS drivers_user_id_idx ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS shipments_shipper_idx ON public.shipments(shipper_id);
CREATE INDEX IF NOT EXISTS shipments_receiver_idx ON public.shipments(receiver_id);
CREATE INDEX IF NOT EXISTS shipments_pickup_station_idx ON public.shipments(pickup_station_id);
CREATE INDEX IF NOT EXISTS shipments_delivery_station_idx ON public.shipments(delivery_station_id);
CREATE INDEX IF NOT EXISTS stops_shipment_idx ON public.stops(shipment_id);
CREATE INDEX IF NOT EXISTS stops_station_idx ON public.stops(station_id);
