/*
  # Create stations table (admin-managed waypoints/stops)

  1. New Tables
    - `stations`
      - `id` (uuid, PK)
      - `name` (text) — station name (e.g. "Дархан — Төв агуулах")
      - `city` (text) — city name reference
      - `position` (jsonb) — [lat, lng] coordinates
      - `type` (text) — station type: warehouse, terminal, checkpoint, customs
      - `contact` (text) — contact info
      - `active` (boolean) — whether station is active
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can SELECT all
    - Only admin can INSERT/UPDATE/DELETE
*/

CREATE TABLE IF NOT EXISTS public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  position jsonb NOT NULL DEFAULT '[0,0]',
  type text NOT NULL DEFAULT 'warehouse',
  contact text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stations_select_all"
  ON public.stations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stations_admin_insert"
  ON public.stations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "stations_admin_update"
  ON public.stations
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "stations_admin_delete"
  ON public.stations
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
