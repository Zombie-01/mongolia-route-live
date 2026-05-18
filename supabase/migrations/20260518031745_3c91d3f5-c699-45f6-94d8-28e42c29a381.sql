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

CREATE POLICY "shipments_select_all" ON public.shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "shipments_admin_insert" ON public.shipments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "shipments_admin_update" ON public.shipments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "shipments_admin_delete" ON public.shipments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "stops_select_all" ON public.stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "stops_admin_insert" ON public.stops FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "stops_admin_update" ON public.stops FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "stops_admin_delete" ON public.stops FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS shipments_updated_at ON public.shipments;
CREATE TRIGGER shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed demo shipments
INSERT INTO public.shipments (id, tracking_id, status, type, country, cargo, origin, destination, route, progress, position, speed, eta, driver_name, driver_phone, driver_license, driver_experience, driver_rating, vehicle_id, plate_number, capacity, total_weight, shipper, consignee, cargo_items, gps_online) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','MN-2041','in_transit','truck','MN','Малын тэжээл — холимог','Улаанбаатар (Налайх агуулах)','Дархан','[[47.9184,106.9177],[48.3,106.85],[48.9,106.3],[49.486,105.962]]',0.18,'[47.9184,106.9177]',78,'3ц 40м','Б. Батбаяр','+976 9911 2233','B/C/E',8,4.8,'УБА-9921','УБА-9921','25 тн','20 тн','Тэжээл Трейд ХХК','Дархан-Сэлэнгэ Малчдын Холбоо','[{"name":"Овьёос","qty":10},{"name":"Хорголжин тэжээл (pellet)","qty":7},{"name":"Хивэг","qty":3}]',true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901','MN-2042','in_transit','truck','MN','Малын тэжээл — өвс, хивэг','Улаанбаатар','Эрдэнэт','[[47.9184,106.9177],[48.4,106.3],[48.9,105.4],[49.0277,104.0444]]',0.42,'[47.9184,106.9177]',65,'5ц 10м','Д. Энхбаяр','+976 9922 4411','B/C',5,4.6,'УБЕ-4410','УБЕ-4410','20 тн','18 тн','Хангай Агро ХХК','Эрдэнэт ХАА хоршоо','[{"name":"Боолтлосон өвс","qty":12,"note":"350 боодол"},{"name":"Хивэг","qty":6}]',true),
('c3d4e5f6-a7b8-9012-cdef-123456789012','MN-2043','stopped','truck','MN','Малын тэжээл — давс, эрдэс','Улаанбаатар','Чойр','[[47.9184,106.9177],[47.4,107.3],[46.7,108.0],[46.36,108.36]]',0.55,'[47.9184,106.9177]',0,'2ц 20м','С. Мөнхбат','+976 9955 3344','B/C',11,4.9,'УБМ-7782','УБМ-7782','15 тн','12 тн','Эрдэс Мин ХХК','Говьсүмбэр МАА','[{"name":"Малын давс (block)","qty":5,"note":"500 ширхэг"},{"name":"Эрдэс тэжээл","qty":4},{"name":"Хорголжин (vitamin pellet)","qty":3}]',true),
('d4e5f6a7-b8c9-0123-def0-123456789012','MN-2044','delayed','truck','MN','Малын тэжээл — өвөлжилт','Улаанбаатар','Ховд','[[47.9184,106.9177],[47.5,104.0],[47.7,100.0],[48.0056,91.6419]]',0.27,'[47.9184,106.9177]',52,'18ц 05м','Г. Түмэн-Өлзий','+976 9988 7766','B/C/E',14,4.7,'УБХ-1180','УБХ-1180','30 тн','28 тн','Засгийн газрын нөөц','Ховд аймгийн ЗДТГ','[{"name":"Овьёос","qty":10},{"name":"Хорголжин тэжээл","qty":10},{"name":"Хивэг","qty":5},{"name":"Малын давс","qty":3}]',true),
('e5f6a7b8-c9d0-1234-ef01-234567890123','MN-2045','delivered','truck','MN','Малын тэжээл — хүргэгдсэн','Улаанбаатар','Сайншанд','[[47.9184,106.9177],[47.0,108.0],[45.5,109.5],[44.895,110.139]]',1.0,'[44.895,110.139]',0,'Хүргэгдсэн','Н. Ариунаа','+976 9944 2020','B/C',6,5.0,'УБС-3340','УБС-3340','18 тн','15 тн','Тэжээл Трейд ХХК','Дорноговь МАА','[{"name":"Хорголжин тэжээл","qty":10},{"name":"Хивэг","qty":5}]',true),
('f6a7b8c9-d0e1-2345-f012-345678901234','RU-W-7781','in_transit','wagon','RU','Овьёос (ОХУ-аас)','Наушки, ОХУ','Улаанбаатар','[[50.3833,106.1167],[50.236,106.211],[49.486,105.962],[48.9,106.3],[47.9184,106.9177]]',0.32,'[47.9184,106.9177]',48,'8ц 15м','Галт тэрэг бр. №14 — А. Иванов','+7 924 555 1100','RZD-Class A',20,4.9,'ВАГОН-2204','ВАГОН-2204 / 4 вагон','260 тн (4×65)','240 тн','Бурятзерно (Улаан-Үд)','Тэжээл Трейд ХХК','[{"name":"Овьёос (шуумалгүй)","qty":160,"note":"2 вагон"},{"name":"Хорголжин тэжээл (komp.feed)","qty":80,"note":"1 вагон"}]',true),
('a7b8c9d0-e1f2-3456-0123-456789012345','RU-W-7782','in_transit','wagon','RU','Хивэг, овьёосны хүрз (ОХУ)','Улаан-Үд, ОХУ','Эрдэнэт','[[51.834,107.584],[50.4,106.5],[49.8,105.5],[49.0277,104.0444]]',0.15,'[47.9184,106.9177]',55,'12ц 40м','Галт тэрэг бр. №21 — С. Петров','+7 924 700 8899','RZD-Class A',16,4.7,'ВАГОН-3318','ВАГОН-3318 / 3 вагон','195 тн','180 тн','Сибирь-Агро','Эрдэнэт Хүнс ХХК','[{"name":"Хивэг (улаан буудайн)","qty":120,"note":"2 вагон"},{"name":"Овьёосны хүрз","qty":60,"note":"1 вагон"}]',true),
('b8c9d0e1-f2a3-4567-1234-567890123456','CN-W-9012','in_transit','wagon','CN','Хорголжин тэжээл (БНХАУ)','Эрээн, БНХАУ','Улаанбаатар','[[43.6533,111.9779],[43.7228,111.8953],[44.5,111.0],[45.5,109.5],[47.0,108.0],[47.9184,106.9177]]',0.58,'[47.9184,106.9177]',62,'6ц 05м','Галт тэрэг бр. №07 — 王 Wang','+86 138 7000 4422','CR-Class A',12,4.6,'ВАГОН-5540','ВАГОН-5540 / 5 вагон','325 тн','300 тн','Inner Mongolia Feed Group','Тэжээл Трейд ХХК','[{"name":"Хорголжин тэжээл (premium)","qty":200,"note":"3 вагон"},{"name":"Эрдэс/витамин premix","qty":60,"note":"1 вагон"},{"name":"Малын давс block","qty":40,"note":"1 вагон"}]',true),
('c9d0e1f2-a3b4-5678-2345-678901234567','CN-W-9013','delayed','wagon','CN','Soybean meal + premix (БНХАУ)','Тяньжин, БНХАУ','Дархан','[[39.3434,117.3616],[42.0,114.0],[43.7228,111.8953],[45.5,109.5],[47.0,108.0],[47.9184,106.9177],[48.3,106.85],[49.486,105.962]]',0.41,'[47.9184,106.9177]',38,'22ц 10м','Галт тэрэг бр. №31 — 李 Li','+86 139 2200 5577','CR-Class A',9,4.4,'ВАГОН-6677','ВАГОН-6677 / 4 вагон','260 тн','220 тн','Tianjin Agro Export','Дархан-Уул Тэжээл ХХК','[{"name":"Шар буурцагны хүрз (soybean meal)","qty":130,"note":"2 вагон"},{"name":"Эрдэс premix","qty":50},{"name":"Хорголжин тэжээл","qty":40}]',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890',1,'Дархан — Төв агуулах','[49.486,105.962]','[{"name":"Овьёос","qty":6},{"name":"Хорголжин тэжээл","qty":4}]','3ц 40м','pending','Г. Сүрэн +976 9911 5544'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890',2,'Дархан — Малын зах','[49.46,105.92]','[{"name":"Овьёос","qty":4},{"name":"Хорголжин тэжээл","qty":3},{"name":"Хивэг","qty":3}]','4ц 20м','pending','Д. Бат +976 9966 7788'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901',1,'Эрдэнэт — Баян-Өндөр агуулах','[49.0277,104.0444]','[{"name":"Боолтлосон өвс","qty":12},{"name":"Хивэг","qty":6}]','5ц 10м','pending','Б. Цэрэн +976 9900 1212'),
('c3d4e5f6-a7b8-9012-cdef-123456789012',1,'Чойр — МАА төв','[46.36,108.36]','[{"name":"Малын давс","qty":3},{"name":"Эрдэс тэжээл","qty":2}]','2ц 20м','pending','Х. Болд +976 9933 1010'),
('c3d4e5f6-a7b8-9012-cdef-123456789012',2,'Чойр — Сум 3 нэгдэл','[46.30,108.40]','[{"name":"Малын давс","qty":2},{"name":"Эрдэс тэжээл","qty":2},{"name":"Хорголжин","qty":3}]','3ц 00м','pending',NULL),
('d4e5f6a7-b8c9-0123-def0-123456789012',1,'Ховд — Жаргалант сум','[48.0056,91.6419]','[{"name":"Овьёос","qty":6},{"name":"Хорголжин тэжээл","qty":6}]','18ц 05м','pending',NULL),
('d4e5f6a7-b8c9-0123-def0-123456789012',2,'Ховд — Мөст сум','[47.65,92.75]','[{"name":"Овьёос","qty":4},{"name":"Хорголжин","qty":4},{"name":"Хивэг","qty":5},{"name":"Давс","qty":3}]','21ц 30м','pending',NULL),
('e5f6a7b8-c9d0-1234-ef01-234567890123',1,'Сайншанд — Төв агуулах','[44.895,110.139]','[{"name":"Хорголжин тэжээл","qty":10},{"name":"Хивэг","qty":5}]','Хүргэгдсэн','done',NULL),
('f6a7b8c9-d0e1-2345-f012-345678901234',1,'УБ — Толгойт төмөр зам терминал','[47.9184,106.9177]','[{"name":"Овьёос","qty":160},{"name":"Хорголжин тэжээл","qty":80}]','8ц 15м','pending','Терминал диспетчер +976 7011 2200'),
('a7b8c9d0-e1f2-3456-0123-456789012345',1,'Эрдэнэт — төмөр зам тавцан','[49.0277,104.0444]','[{"name":"Хивэг","qty":120},{"name":"Овьёосны хүрз","qty":60}]','12ц 40м','pending',NULL),
('b8c9d0e1-f2a3-4567-1234-567890123456',1,'Замын-Үүд — гаалийн агуулах','[43.7228,111.8953]','[{"name":"Эрдэс/витамин premix","qty":60}]','Гаалийн боловсруулалт','done',NULL),
('b8c9d0e1-f2a3-4567-1234-567890123456',2,'УБ — Толгойт терминал','[47.9184,106.9177]','[{"name":"Хорголжин тэжээл","qty":200},{"name":"Малын давс","qty":40}]','6ц 05м','pending',NULL),
('c9d0e1f2-a3b4-5678-2345-678901234567',1,'Замын-Үүд — гааль','[43.7228,111.8953]','[{"name":"Бүх ачаа — гаалийн үзлэг","qty":220}]','Хоцрол: цаасан ажиллагаа','done',NULL),
('c9d0e1f2-a3b4-5678-2345-678901234567',2,'Дархан — Хүнсний агуулах','[49.486,105.962]','[{"name":"Soybean meal","qty":130},{"name":"Эрдэс premix","qty":50},{"name":"Хорголжин тэжээл","qty":40}]','22ц 10м','pending',NULL)
ON CONFLICT DO NOTHING;