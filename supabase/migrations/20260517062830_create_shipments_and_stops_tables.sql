/*
  # Create shipments and stops tables

  1. New Tables
    - `shipments`
      - `id` (uuid, PK) — unique shipment identifier
      - `tracking_id` (text, unique) — human-readable tracking code (e.g. "MN-2041")
      - `status` (text) — shipment status: in_transit, stopped, delayed, delivered
      - `type` (text) — vehicle type: truck or wagon
      - `country` (text) — country code: MN, RU, CN
      - `cargo` (text) — short cargo description
      - `origin` (text) — origin city name
      - `destination` (text) — destination city name
      - `route` (jsonb) — array of [lat, lng] waypoints defining the route
      - `road_route` (jsonb) — detailed OSRM road geometry (array of [lat, lng])
      - `progress` (float) — 0..1 fraction of route completed
      - `position` (jsonb) — current [lat, lng] position
      - `speed` (int) — current speed in km/h
      - `eta` (text) — estimated time of arrival string
      - `driver_name` (text) — driver display name
      - `driver_phone` (text) — driver phone number
      - `driver_license` (text) — driver license number
      - `driver_experience` (int) — years of experience
      - `driver_rating` (float) — driver rating 0..5
      - `vehicle_id` (text) — vehicle identifier
      - `plate_number` (text) — license plate
      - `capacity` (text) — vehicle capacity description
      - `total_weight` (text) — total cargo weight
      - `shipper` (text) — shipper name
      - `consignee` (text) — consignee name
      - `cargo_items` (jsonb) — array of {name, qty, notes} objects
      - `gps_online` (boolean) — whether GPS is active
      - `last_gps_at` (timestamptz) — last GPS ping timestamp
      - `last_known_pos` (jsonb) — last known [lat, lng] before GPS went offline
      - `manual_override` (boolean) — admin has manually overridden position
      - `created_by` (uuid, FK) — user who created the shipment
      - `created_at` (timestamptz) — creation timestamp
      - `updated_at` (timestamptz) — last update timestamp

    - `stops`
      - `id` (uuid, PK) — unique stop identifier
      - `shipment_id` (uuid, FK) — references shipments.id
      - `seq` (int) — stop sequence order (0=origin, N=destination)
      - `location` (text) — city/location name
      - `position` (jsonb) — [lat, lng] of the stop
      - `items` (jsonb) — array of {name, qty, notes} items to drop off
      - `eta` (text) — estimated arrival time string
      - `status` (text) — pending or done
      - `contact` (text) — contact person/phone at stop
      - `created_at` (timestamptz) — creation timestamp

  2. Security
    - Enable RLS on both tables
    - `shipments`: authenticated users can SELECT all; only admin can INSERT/UPDATE/DELETE
    - `stops`: authenticated users can SELECT all; only admin can INSERT/UPDATE/DELETE
    - Both tables use `has_role(auth.uid(), 'admin')` for write access

  3. Indexes
    - `shipments_tracking_id_idx` on tracking_id for lookup
    - `shipments_created_by_idx` on created_by
    - `shipments_status_idx` on status
    - `stops_shipment_id_idx` on shipment_id for join performance
*/

-- Shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'in_transit',
  type text NOT NULL DEFAULT 'truck',
  country text NOT NULL DEFAULT 'MN',
  cargo text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  route jsonb NOT NULL DEFAULT '[]',
  road_route jsonb DEFAULT NULL,
  progress double precision NOT NULL DEFAULT 0,
  position jsonb NOT NULL DEFAULT '[0,0]',
  speed integer NOT NULL DEFAULT 0,
  eta text DEFAULT '',
  driver_name text NOT NULL DEFAULT '',
  driver_phone text DEFAULT '',
  driver_license text DEFAULT '',
  driver_experience integer DEFAULT 0,
  driver_rating double precision DEFAULT 0,
  vehicle_id text DEFAULT '',
  plate_number text DEFAULT '',
  capacity text DEFAULT '',
  total_weight text DEFAULT '',
  shipper text DEFAULT '',
  consignee text DEFAULT '',
  cargo_items jsonb NOT NULL DEFAULT '[]',
  gps_online boolean NOT NULL DEFAULT true,
  last_gps_at timestamptz DEFAULT NULL,
  last_known_pos jsonb DEFAULT NULL,
  manual_override boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS shipments_tracking_id_idx ON public.shipments(tracking_id);
CREATE INDEX IF NOT EXISTS shipments_created_by_idx ON public.shipments(created_by);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments(status);

-- Stops table
CREATE TABLE IF NOT EXISTS public.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  seq integer NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT '',
  position jsonb NOT NULL DEFAULT '[0,0]',
  items jsonb NOT NULL DEFAULT '[]',
  eta text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  contact text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stops_shipment_id_idx ON public.stops(shipment_id);

-- RLS policies for shipments
-- RLS policies for shipments
DROP POLICY IF EXISTS "shipments_select_all" ON public.shipments;
CREATE POLICY "shipments_select_all"
  ON public.shipments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "shipments_admin_insert" ON public.shipments;
CREATE POLICY "shipments_admin_insert"
  ON public.shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "shipments_admin_update" ON public.shipments;
CREATE POLICY "shipments_admin_update"
  ON public.shipments
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "shipments_admin_delete" ON public.shipments;
CREATE POLICY "shipments_admin_delete"
  ON public.shipments
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for stops
DROP POLICY IF EXISTS "stops_select_all" ON public.stops;
CREATE POLICY "stops_select_all"
  ON public.stops
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "stops_admin_insert" ON public.stops;
CREATE POLICY "stops_admin_insert"
  ON public.stops
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "stops_admin_update" ON public.stops;
CREATE POLICY "stops_admin_update"
  ON public.stops
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "stops_admin_delete" ON public.stops;
CREATE POLICY "stops_admin_delete"
  ON public.stops
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shipments_updated_at ON public.shipments;
CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
