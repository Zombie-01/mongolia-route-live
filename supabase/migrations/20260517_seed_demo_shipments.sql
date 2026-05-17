/*
  # Seed demo shipments and stops

  This migration populates the database with demo shipment data for development/testing.
  Run this after the tables are created.
*/

-- Insert demo shipments
INSERT INTO public.shipments (
  id, tracking_id, status, type, country, cargo, origin, destination,
  route, progress, position, speed, eta, driver_name, driver_phone,
  driver_license, driver_experience, driver_rating, vehicle_id, plate_number,
  capacity, total_weight, shipper, consignee, cargo_items, gps_online,
  created_at, updated_at
) VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'MN-2041',
    'in_transit',
    'truck',
    'MN',
    'Малын тэжээл — холимог',
    'Улаанбаатар (Налайх агуулах)',
    'Дархан',
    '[[47.9184, 106.9177], [48.3, 106.85], [48.9, 106.3], [49.486, 105.962]]'::jsonb,
    0.18,
    '[47.9184, 106.9177]'::jsonb,
    78,
    '3ц 40м',
    'Б. Батбаяр',
    '+976 9911 2233',
    'B/C/E',
    8,
    4.8,
    'УБА-9921',
    'УБА-9921',
    '25 тн',
    '20 тн',
    'Тэжээл Трейд ХХК',
    'Дархан-Сэлэнгэ Малчдын Холбоо',
    '[{"name":"Овьёос","qty":10},{"name":"Хорголжин тэжээл (pellet)","qty":7},{"name":"Хивэг","qty":3}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
    'MN-2042',
    'in_transit',
    'truck',
    'MN',
    'Малын тэжээл — өвс, хивэг',
    'Улаанбаатар',
    'Эрдэнэт',
    '[[47.9184, 106.9177], [48.4, 106.3], [48.9, 105.4], [49.0277, 104.0444]]'::jsonb,
    0.42,
    '[47.9184, 106.9177]'::jsonb,
    65,
    '5ц 10м',
    'Д. Энхбаяр',
    '+976 9922 4411',
    'B/C',
    5,
    4.6,
    'УБЕ-4410',
    'УБЕ-4410',
    '20 тн',
    '18 тн',
    'Хангай Агро ХХК',
    'Эрдэнэт ХАА хоршоо',
    '[{"name":"Боолтлосон өвс","qty":12,"note":"350 боодол"},{"name":"Хивэг","qty":6}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid,
    'MN-2043',
    'stopped',
    'truck',
    'MN',
    'Малын тэжээл — давс, эрдэс',
    'Улаанбаатар',
    'Чойр',
    '[[47.9184, 106.9177], [47.4, 107.3], [46.7, 108.0], [46.36, 108.36]]'::jsonb,
    0.55,
    '[47.9184, 106.9177]'::jsonb,
    0,
    '2ц 20м',
    'С. Мөнхбат',
    '+976 9955 3344',
    'B/C',
    11,
    4.9,
    'УБМ-7782',
    'УБМ-7782',
    '15 тн',
    '12 тн',
    'Эрдэс Мин ХХК',
    'Говьсүмбэр МАА',
    '[{"name":"Малын давс (block)","qty":5,"note":"500 ширхэг"},{"name":"Эрдэс тэжээл","qty":4},{"name":"Хорголжин (vitamin pellet)","qty":3}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  (
    'd4e5f6a7-b8c9-0123-def0-123456789012'::uuid,
    'MN-2044',
    'delayed',
    'truck',
    'MN',
    'Малын тэжээл — өвөлжилт',
    'Улаанбаатар',
    'Ховд',
    '[[47.9184, 106.9177], [47.5, 104.0], [47.7, 100.0], [48.0056, 91.6419]]'::jsonb,
    0.27,
    '[47.9184, 106.9177]'::jsonb,
    52,
    '18ц 05м',
    'Г. Түмэн-Өлзий',
    '+976 9988 7766',
    'B/C/E',
    14,
    4.7,
    'УБХ-1180',
    'УБХ-1180',
    '30 тн',
    '28 тн',
    'Засгийн газрын нөөц',
    'Ховд аймгийн ЗДТГ',
    '[{"name":"Овьёос","qty":10},{"name":"Хорголжин тэжээл","qty":10},{"name":"Хивэг","qty":5},{"name":"Малын давс","qty":3}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  (
    'e5f6a7b8-c9d0-1234-ef01-234567890123'::uuid,
    'MN-2045',
    'delivered',
    'truck',
    'MN',
    'Малын тэжээл — хүргэгдсэн',
    'Улаанбаатар',
    'Сайншанд',
    '[[47.9184, 106.9177], [47.0, 108.0], [45.5, 109.5], [44.895, 110.139]]'::jsonb,
    1.0,
    '[44.895, 110.139]'::jsonb,
    0,
    'Хүргэгдсэн',
    'Н. Ариунаа',
    '+976 9944 2020',
    'B/C',
    6,
    5.0,
    'УБС-3340',
    'УБС-3340',
    '18 тн',
    '15 тн',
    'Тэжээл Трейд ХХК',
    'Дорноговь МАА',
    '[{"name":"Хорголжин тэжээл","qty":10},{"name":"Хивэг","qty":5}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  -- Wagons from Russia
  (
    'f6a7b8c9-d0e1-2345-f012-345678901234'::uuid,
    'RU-W-7781',
    'in_transit',
    'wagon',
    'RU',
    'Овьёос (ОХУ-аас)',
    'Наушки, ОХУ',
    'Улаанбаатар',
    '[[50.3833, 106.1167], [50.236, 106.211], [49.486, 105.962], [48.9, 106.3], [47.9184, 106.9177]]'::jsonb,
    0.32,
    '[47.9184, 106.9177]'::jsonb,
    48,
    '8ц 15м',
    'Галт тэрэг бр. №14 — А. Иванов',
    '+7 924 555 1100',
    'RZD-Class A',
    20,
    4.9,
    'ВАГОН-2204',
    'ВАГОН-2204 / 4 вагон',
    '260 тн (4×65)',
    '240 тн',
    'Бурятзерно (Улаан-Үд)',
    'Тэжээл Трейд ХХК',
    '[{"name":"Овьёос (шуумалгүй)","qty":160,"note":"2 вагон"},{"name":"Хорголжин тэжээл (komp.feed)","qty":80,"note":"1 вагон"}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  (
    'a7b8c9d0-e1f2-3456-0123-456789012345'::uuid,
    'RU-W-7782',
    'in_transit',
    'wagon',
    'RU',
    'Хивэг, овьёосны хүрз (ОХУ)',
    'Улаан-Үд, ОХУ',
    'Эрдэнэт',
    '[[51.834, 107.584], [50.4, 106.5], [49.8, 105.5], [49.0277, 104.0444]]'::jsonb,
    0.15,
    '[47.9184, 106.9177]'::jsonb,
    55,
    '12ц 40м',
    'Галт тэрэг бр. №21 — С. Петров',
    '+7 924 700 8899',
    'RZD-Class A',
    16,
    4.7,
    'ВАГОН-3318',
    'ВАГОН-3318 / 3 вагон',
    '195 тн',
    '180 тн',
    'Сибирь-Агро',
    'Эрдэнэт Хүнс ХХК',
    '[{"name":"Хивэг (улаан буудайн)","qty":120,"note":"2 вагон"},{"name":"Овьёосны хүрз","qty":60,"note":"1 вагон"}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  -- Wagons from China
  (
    'b8c9d0e1-f2a3-4567-1234-567890123456'::uuid,
    'CN-W-9012',
    'in_transit',
    'wagon',
    'CN',
    'Хорголжин тэжээл (БНХАУ)',
    'Эрээн, БНХАУ',
    'Улаанбаатар',
    '[[43.6533, 111.9779], [43.7228, 111.8953], [44.5, 111.0], [45.5, 109.5], [47.0, 108.0], [47.9184, 106.9177]]'::jsonb,
    0.58,
    '[47.9184, 106.9177]'::jsonb,
    62,
    '6ц 05м',
    'Галт тэрэг бр. №07 — 王 Wang',
    '+86 138 7000 4422',
    'CR-Class A',
    12,
    4.6,
    'ВАГОН-5540',
    'ВАГОН-5540 / 5 вагон',
    '325 тн',
    '300 тн',
    'Inner Mongolia Feed Group',
    'Тэжээл Трейд ХХК',
    '[{"name":"Хорголжин тэжээл (premium)","qty":200,"note":"3 вагон"},{"name":"Эрдэс/витамин premix","qty":60,"note":"1 вагон"},{"name":"Малын давс block","qty":40,"note":"1 вагон"}]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  (
    'c9d0e1f2-a3b4-5678-2345-678901234567'::uuid,
    'CN-W-9013',
    'delayed',
    'wagon',
    'CN',
    'Soybean meal + premix (БНХАУ)',
    'Тяньжин, БНХАУ',
    'Дархан',
    '[[39.3434, 117.3616], [42.0, 114.0], [43.7228, 111.8953], [45.5, 109.5], [47.0, 108.0], [47.9184, 106.9177], [48.3, 106.85], [49.486, 105.962]]'::jsonb,
    0.41,
    '[47.9184, 106.9177]'::jsonb,
    38,
    '22ц 10м',
    'Галт тэрэг бр. №31 — 李 Li',
    '+86 139 2200 5577',
    'CR-Class A',
    9,
    4.4,
    'ВАГОН-6677',
    'ВАГОН-6677 / 4 вагон',
    '260 тн',
    '220 тн',
    'Tianjin Agro Export',
    'Дархан-Уул Тэжээл ХХК',
    '[{"name":"Шар буурцагны хүрз (soybean meal)","qty":130,"note":"2 вагон"},{"name":"Эрдэс premix","qty":50},{"name":"Хорголжин тэжээл","qty":40}]'::jsonb,
    true,
    NOW(),
    NOW()
  );

-- Insert stops for each shipment
-- Shipment MN-2041
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    1,
    'Дархан — Төв агуулах',
    '[49.486, 105.962]'::jsonb,
    '[{"name":"Овьёос","qty":6},{"name":"Хорголжин тэжээл","qty":4}]'::jsonb,
    '3ц 40м',
    'pending',
    'Г. Сүрэн +976 9911 5544'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    2,
    'Дархан — Малын зах',
    '[49.46, 105.92]'::jsonb,
    '[{"name":"Овьёос","qty":4},{"name":"Хорголжин тэжээл","qty":3},{"name":"Хивэг","qty":3}]'::jsonb,
    '4ц 20м',
    'pending',
    'Д. Бат +976 9966 7788'
  );

-- Shipment MN-2042
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
    1,
    'Эрдэнэт — Баян-Өндөр агуулах',
    '[49.0277, 104.0444]'::jsonb,
    '[{"name":"Боолтлосон өвс","qty":12},{"name":"Хивэг","qty":6}]'::jsonb,
    '5ц 10м',
    'pending',
    'Б. Цэрэн +976 9900 1212'
  );

-- Shipment MN-2043
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid,
    1,
    'Чойр — МАА төв',
    '[46.36, 108.36]'::jsonb,
    '[{"name":"Малын давс","qty":3},{"name":"Эрдэс тэжээл","qty":2}]'::jsonb,
    '2ц 20м',
    'pending',
    'Х. Болд +976 9933 1010'
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid,
    2,
    'Чойр — Сум 3 нэгдэл',
    '[46.30, 108.40]'::jsonb,
    '[{"name":"Малын давс","qty":2},{"name":"Эрдэс тэжээл","qty":2},{"name":"Хорголжин","qty":3}]'::jsonb,
    '3ц 00м',
    'pending',
    NULL
  );

-- Shipment MN-2044
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'd4e5f6a7-b8c9-0123-def0-123456789012'::uuid,
    1,
    'Ховд — Жаргалант сум',
    '[48.0056, 91.6419]'::jsonb,
    '[{"name":"Овьёос","qty":6},{"name":"Хорголжин тэжээл","qty":6}]'::jsonb,
    '18ц 05м',
    'pending',
    NULL
  ),
  (
    'd4e5f6a7-b8c9-0123-def0-123456789012'::uuid,
    2,
    'Ховд — Мөст сум',
    '[47.65, 92.75]'::jsonb,
    '[{"name":"Овьёос","qty":4},{"name":"Хорголжин","qty":4},{"name":"Хивэг","qty":5},{"name":"Давс","qty":3}]'::jsonb,
    '21ц 30м',
    'pending',
    NULL
  );

-- Shipment MN-2045
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'e5f6a7b8-c9d0-1234-ef01-234567890123'::uuid,
    1,
    'Сайншанд — Төв агуулах',
    '[44.895, 110.139]'::jsonb,
    '[{"name":"Хорголжин тэжээл","qty":10},{"name":"Хивэг","qty":5}]'::jsonb,
    'Хүргэгдсэн',
    'done',
    NULL
  );

-- Shipment RU-W-7781
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'f6a7b8c9-d0e1-2345-f012-345678901234'::uuid,
    1,
    'УБ — Толгойт төмөр зам терминал',
    '[47.9184, 106.9177]'::jsonb,
    '[{"name":"Овьёос","qty":160},{"name":"Хорголжин тэжээл","qty":80}]'::jsonb,
    '8ц 15м',
    'pending',
    'Терминал диспетчер +976 7011 2200'
  );

-- Shipment RU-W-7782
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'a7b8c9d0-e1f2-3456-0123-456789012345'::uuid,
    1,
    'Эрдэнэт — төмөр зам тавцан',
    '[49.0277, 104.0444]'::jsonb,
    '[{"name":"Хивэг","qty":120},{"name":"Овьёосны хүрз","qty":60}]'::jsonb,
    '12ц 40м',
    'pending',
    NULL
  );

-- Shipment CN-W-9012
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'b8c9d0e1-f2a3-4567-1234-567890123456'::uuid,
    1,
    'Замын-Үүд — гаалийн агуулах',
    '[43.7228, 111.8953]'::jsonb,
    '[{"name":"Эрдэс/витамин premix","qty":60}]'::jsonb,
    'Гаалийн боловсруулалт',
    'done',
    NULL
  ),
  (
    'b8c9d0e1-f2a3-4567-1234-567890123456'::uuid,
    2,
    'УБ — Толгойт терминал',
    '[47.9184, 106.9177]'::jsonb,
    '[{"name":"Хорголжин тэжээл","qty":200},{"name":"Малын давс","qty":40}]'::jsonb,
    '6ц 05м',
    'pending',
    NULL
  );

-- Shipment CN-W-9013
INSERT INTO public.stops (shipment_id, seq, location, position, items, eta, status, contact)
VALUES
  (
    'c9d0e1f2-a3b4-5678-2345-678901234567'::uuid,
    1,
    'Замын-Үүд — гааль',
    '[43.7228, 111.8953]'::jsonb,
    '[{"name":"Бүх ачаа — гаалийн үзлэг","qty":220}]'::jsonb,
    'Хоцрол: цаасан ажиллагаа',
    'done',
    NULL
  ),
  (
    'c9d0e1f2-a3b4-5678-2345-678901234567'::uuid,
    2,
    'Дархан — Хүнсний агуулах',
    '[49.486, 105.962]'::jsonb,
    '[{"name":"Soybean meal","qty":130},{"name":"Эрдэс premix","qty":50},{"name":"Хорголжин тэжээл","qty":40}]'::jsonb,
    '22ц 10м',
    'pending',
    NULL
  );
