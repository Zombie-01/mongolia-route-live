/*
  # Create drivers table

  1. New Tables
    - `drivers`
      - `id` (uuid, PK) — unique driver identifier
      - `name` (text) — driver display name (e.g. "Б. Батбаяр")
      - `phone` (text) — phone number
      - `license` (text) — license class (e.g. "B/C/E")
      - `experience` (int) — years of experience
      - `rating` (float) — driver rating 0..5
      - `plate_number` (text) — vehicle license plate
      - `vehicle_id` (text) — vehicle identifier
      - `capacity` (text) — vehicle capacity (e.g. "25 тн")
      - `type` (text) — vehicle type: truck or wagon
      - `country` (text) — country code: MN, RU, CN
      - `active` (boolean) — whether driver is currently available
      - `created_at` (timestamptz) — creation timestamp

  2. Security
    - Enable RLS on drivers table
    - Authenticated users can SELECT all
    - Only admin can INSERT/UPDATE/DELETE

  3. Indexes
    - `drivers_active_idx` on active for filtering
*/

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  license text NOT NULL DEFAULT 'B/C',
  experience integer NOT NULL DEFAULT 0,
  rating double precision NOT NULL DEFAULT 4.5,
  plate_number text NOT NULL DEFAULT '',
  vehicle_id text NOT NULL DEFAULT '',
  capacity text NOT NULL DEFAULT '20 тн',
  type text NOT NULL DEFAULT 'truck',
  country text NOT NULL DEFAULT 'MN',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS drivers_active_idx ON public.drivers(active);

DROP POLICY IF EXISTS "drivers_select_all" ON public.drivers;
CREATE POLICY "drivers_select_all"
  ON public.drivers
  FOR SELECT
  TO authenticated
  USING (true);
DROP POLICY IF EXISTS "drivers_admin_insert" ON public.drivers;
CREATE POLICY "drivers_admin_insert"
  ON public.drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "drivers_admin_update" ON public.drivers;
CREATE POLICY "drivers_admin_update"
  ON public.drivers
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "drivers_admin_delete" ON public.drivers;
CREATE POLICY "drivers_admin_delete"
  ON public.drivers
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
