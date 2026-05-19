CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  license text DEFAULT '',
  experience integer DEFAULT 0,
  rating double precision DEFAULT 4.5,
  plate_number text DEFAULT '',
  vehicle_id text DEFAULT '',
  capacity text DEFAULT '',
  type text NOT NULL DEFAULT 'truck',
  country text NOT NULL DEFAULT 'MN',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'license'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN license text DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'experience'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN experience integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN rating double precision DEFAULT 4.5;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'plate_number'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN plate_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN vehicle_id text DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'capacity'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN capacity text DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN type text NOT NULL DEFAULT 'truck';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN country text NOT NULL DEFAULT 'MN';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'active'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_select_all" ON public.drivers;
CREATE POLICY "drivers_select_all" ON public.drivers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "drivers_admin_insert" ON public.drivers;
CREATE POLICY "drivers_admin_insert" ON public.drivers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "drivers_admin_update" ON public.drivers;
CREATE POLICY "drivers_admin_update" ON public.drivers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "drivers_admin_delete" ON public.drivers;
CREATE POLICY "drivers_admin_delete" ON public.drivers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.stations ADD COLUMN name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.stations ADD COLUMN latitude double precision NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.stations ADD COLUMN longitude double precision NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.stations ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.stations ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stations_select_all" ON public.stations;
CREATE POLICY "stations_select_all" ON public.stations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "stations_admin_insert" ON public.stations;
CREATE POLICY "stations_admin_insert" ON public.stations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "stations_admin_update" ON public.stations;
CREATE POLICY "stations_admin_update" ON public.stations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "stations_admin_delete" ON public.stations;
CREATE POLICY "stations_admin_delete" ON public.stations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER stations_updated_at BEFORE UPDATE ON public.stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();