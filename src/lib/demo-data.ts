export type LatLng = [number, number];
export type ShipmentStatus = "in_transit" | "stopped" | "delivered" | "delayed";
export type VehicleType = "truck" | "wagon";

export interface CargoItem {
  name: string;
  qty: number; // tonnes
  unit?: string; // default "тн"
  note?: string;
}

export interface Dropoff {
  location: string;
  position: LatLng;
  items: CargoItem[];
  eta: string;
  status: "pending" | "done";
  contact?: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  cargo: string; // short label
  origin: string;
  destination: string;
  driver: string;
  vehicleId: string;
  status: ShipmentStatus;
  route: LatLng[]; // raw waypoints (used as fallback)
  roadRoute?: LatLng[]; // detailed road geometry (filled from OSRM)
  progress: number;
  speed: number;
  eta: string;
  position: LatLng;
  type?: VehicleType;
  country?: "MN" | "RU" | "CN";

  // GPS state — when offline, freeze position; trucks resume from lastKnown on reconnect.
  // Wagons have type==="wagon" → always treated as "no GPS" (system estimates by time).
  gpsOnline?: boolean;
  lastGpsAt?: string; // ISO timestamp of last successful GPS
  lastKnownPos?: LatLng;
  manualOverride?: boolean; // true if admin set position manually

  // Detailed driver info
  driverPhone: string;
  driverLicense: string;
  driverExperience: string; // e.g. "8 жил"
  driverRating: number; // 0..5
  plateNumber: string;
  capacity: string; // e.g. "25 тн"

  // Detailed cargo
  cargoItems: CargoItem[];
  totalWeight: string; // e.g. "20 тн"
  shipper: string;
  consignee: string;
  shipperId?: string;
  receiverId?: string;
  dropoffs: Dropoff[];
}

const UB: LatLng = [47.9184, 106.9177];
const route = (...pts: LatLng[]) => pts;

// Все ачаа: малын тэжээлийн зөөвөр (livestock feed transport)
export const initialShipments: Shipment[] = [
  {
    id: "s1",
    trackingId: "MN-2041",
    cargo: "Малын тэжээл — холимог",
    origin: "Улаанбаатар (Налайх агуулах)",
    destination: "Дархан",
    driver: "Б. Батбаяр",
    vehicleId: "УБА-9921",
    status: "in_transit",
    route: route(UB, [48.3, 106.85], [48.9, 106.3], [49.486, 105.962]),
    progress: 0.18,
    speed: 78,
    eta: "3ц 40м",
    position: UB,
    driverPhone: "+976 9911 2233",
    driverLicense: "B/C/E",
    driverExperience: "8 жил",
    driverRating: 4.8,
    plateNumber: "УБА-9921",
    capacity: "25 тн",
    shipper: "Тэжээл Трейд ХХК",
    consignee: "Дархан-Сэлэнгэ Малчдын Холбоо",
    shipperId: "cust-001",
    receiverId: "cust-002",
    totalWeight: "20 тн",
    cargoItems: [
      { name: "Овьёос", qty: 10 },
      { name: "Хорголжин тэжээл (pellet)", qty: 7 },
      { name: "Хивэг", qty: 3 },
    ],
    dropoffs: [
      {
        location: "Дархан — Төв агуулах",
        position: [49.486, 105.962],
        items: [
          { name: "Овьёос", qty: 6 },
          { name: "Хорголжин тэжээл", qty: 4 },
        ],
        eta: "3ц 40м",
        status: "pending",
        contact: "Г. Сүрэн +976 9911 5544",
      },
      {
        location: "Дархан — Малын зах",
        position: [49.46, 105.92],
        items: [
          { name: "Овьёос", qty: 4 },
          { name: "Хорголжин тэжээл", qty: 3 },
          { name: "Хивэг", qty: 3 },
        ],
        eta: "4ц 20м",
        status: "pending",
        contact: "Д. Бат +976 9966 7788",
      },
    ],
  },
  {
    id: "s2",
    trackingId: "MN-2042",
    cargo: "Малын тэжээл — өвс, хивэг",
    origin: "Улаанбаатар",
    destination: "Эрдэнэт",
    driver: "Д. Энхбаяр",
    vehicleId: "УБЕ-4410",
    status: "in_transit",
    route: route(UB, [48.4, 106.3], [48.9, 105.4], [49.0277, 104.0444]),
    progress: 0.42,
    speed: 65,
    eta: "5ц 10м",
    position: UB,
    driverPhone: "+976 9922 4411",
    driverLicense: "B/C",
    driverExperience: "5 жил",
    driverRating: 4.6,
    plateNumber: "УБЕ-4410",
    capacity: "20 тн",
    shipper: "Хангай Агро ХХК",
    consignee: "Эрдэнэт ХАА хоршоо",
    shipperId: "cust-003",
    receiverId: "cust-004",
    totalWeight: "18 тн",
    cargoItems: [
      { name: "Боолтлосон өвс", qty: 12, note: "350 боодол" },
      { name: "Хивэг", qty: 6 },
    ],
    dropoffs: [
      {
        location: "Эрдэнэт — Баян-Өндөр агуулах",
        position: [49.0277, 104.0444],
        items: [
          { name: "Боолтлосон өвс", qty: 12 },
          { name: "Хивэг", qty: 6 },
        ],
        eta: "5ц 10м",
        status: "pending",
        contact: "Б. Цэрэн +976 9900 1212",
      },
    ],
  },
  {
    id: "s3",
    trackingId: "MN-2043",
    cargo: "Малын тэжээл — давс, эрдэс",
    origin: "Улаанбаатар",
    destination: "Чойр",
    driver: "С. Мөнхбат",
    vehicleId: "УБМ-7782",
    status: "stopped",
    route: route(UB, [47.4, 107.3], [46.7, 108.0], [46.36, 108.36]),
    progress: 0.55,
    speed: 0,
    eta: "2ц 20м",
    position: UB,
    driverPhone: "+976 9955 3344",
    driverLicense: "B/C",
    driverExperience: "11 жил",
    driverRating: 4.9,
    plateNumber: "УБМ-7782",
    capacity: "15 тн",
    shipper: "Эрдэс Мин ХХК",
    consignee: "Говьсүмбэр МАА",
    shipperId: "cust-005",
    receiverId: "cust-006",
    totalWeight: "12 тн",
    cargoItems: [
      { name: "Малын давс (block)", qty: 5, note: "500 ширхэг" },
      { name: "Эрдэс тэжээл", qty: 4 },
      { name: "Хорголжин (vitamin pellet)", qty: 3 },
    ],
    dropoffs: [
      {
        location: "Чойр — МАА төв",
        position: [46.36, 108.36],
        items: [
          { name: "Малын давс", qty: 3 },
          { name: "Эрдэс тэжээл", qty: 2 },
        ],
        eta: "2ц 20м",
        status: "pending",
        contact: "Х. Болд +976 9933 1010",
      },
      {
        location: "Чойр — Сум 3 нэгдэл",
        position: [46.3, 108.4],
        items: [
          { name: "Малын давс", qty: 2 },
          { name: "Эрдэс тэжээл", qty: 2 },
          { name: "Хорголжин", qty: 3 },
        ],
        eta: "3ц 00м",
        status: "pending",
      },
    ],
  },
  {
    id: "s4",
    trackingId: "MN-2044",
    cargo: "Малын тэжээл — өвөлжилт",
    origin: "Улаанбаатар",
    destination: "Ховд",
    driver: "Г. Түмэн-Өлзий",
    vehicleId: "УБХ-1180",
    status: "delayed",
    route: route(UB, [47.5, 104.0], [47.7, 100.0], [48.0056, 91.6419]),
    progress: 0.27,
    speed: 52,
    eta: "18ц 05м",
    position: UB,
    driverPhone: "+976 9988 7766",
    driverLicense: "B/C/E",
    driverExperience: "14 жил",
    driverRating: 4.7,
    plateNumber: "УБХ-1180",
    capacity: "30 тн",
    shipper: "Засгийн газрын нөөц",
    consignee: "Ховд аймгийн ЗДТГ",
    shipperId: "cust-011",
    receiverId: "cust-012",
    totalWeight: "28 тн",
    cargoItems: [
      { name: "Овьёос", qty: 10 },
      { name: "Хорголжин тэжээл", qty: 10 },
      { name: "Хивэг", qty: 5 },
      { name: "Малын давс", qty: 3 },
    ],
    dropoffs: [
      {
        location: "Ховд — Жаргалант сум",
        position: [48.0056, 91.6419],
        items: [
          { name: "Овьёос", qty: 6 },
          { name: "Хорголжин тэжээл", qty: 6 },
        ],
        eta: "18ц 05м",
        status: "pending",
      },
      {
        location: "Ховд — Мөст сум",
        position: [47.65, 92.75],
        items: [
          { name: "Овьёос", qty: 4 },
          { name: "Хорголжин", qty: 4 },
          { name: "Хивэг", qty: 5 },
          { name: "Давс", qty: 3 },
        ],
        eta: "21ц 30м",
        status: "pending",
      },
    ],
  },
  {
    id: "s5",
    trackingId: "MN-2045",
    cargo: "Малын тэжээл — хүргэгдсэн",
    origin: "Улаанбаатар",
    destination: "Сайншанд",
    driver: "Н. Ариунаа",
    vehicleId: "УБС-3340",
    status: "delivered",
    route: route(UB, [47.0, 108.0], [45.5, 109.5], [44.895, 110.139]),
    progress: 1,
    speed: 0,
    eta: "Хүргэгдсэн",
    position: [44.895, 110.139],
    driverPhone: "+976 9944 2020",
    driverLicense: "B/C",
    driverExperience: "6 жил",
    driverRating: 5.0,
    plateNumber: "УБС-3340",
    capacity: "18 тн",
    shipper: "Тэжээл Трейд ХХК",
    consignee: "Дорноговь МАА",
    shipperId: "cust-013",
    receiverId: "cust-014",
    totalWeight: "15 тн",
    cargoItems: [
      { name: "Хорголжин тэжээл", qty: 10 },
      { name: "Хивэг", qty: 5 },
    ],
    dropoffs: [
      {
        location: "Сайншанд — Төв агуулах",
        position: [44.895, 110.139],
        items: [
          { name: "Хорголжин тэжээл", qty: 10 },
          { name: "Хивэг", qty: 5 },
        ],
        eta: "Хүргэгдсэн",
        status: "done",
      },
    ],
  },
  // Wagons from Russia
  {
    id: "s6",
    trackingId: "RU-W-7781",
    cargo: "Овьёос (ОХУ-аас)",
    origin: "Наушки, ОХУ",
    destination: "Улаанбаатар",
    driver: "Галт тэрэг бр. №14 — А. Иванов",
    vehicleId: "ВАГОН-2204",
    status: "in_transit",
    route: route([50.3833, 106.1167], [50.236, 106.211], [49.486, 105.962], [48.9, 106.3], UB),
    progress: 0.32,
    speed: 48,
    eta: "8ц 15м",
    position: UB,
    type: "wagon",
    country: "RU",
    driverPhone: "+7 924 555 1100",
    driverLicense: "RZD-Class A",
    driverExperience: "20 жил",
    driverRating: 4.9,
    plateNumber: "ВАГОН-2204 / 4 вагон",
    capacity: "260 тн (4×65)",
    shipper: "Бурятзерно (Улаан-Үд)",
    consignee: "Тэжээл Трейд ХХК",
    shipperId: "cust-015",
    receiverId: "cust-013",
    totalWeight: "240 тн",
    cargoItems: [
      { name: "Овьёос (шуумалгүй)", qty: 160, note: "2 вагон" },
      { name: "Хорголжин тэжээл (komp.feed)", qty: 80, note: "1 вагон" },
    ],
    dropoffs: [
      {
        location: "УБ — Толгойт төмөр зам терминал",
        position: UB,
        items: [
          { name: "Овьёос", qty: 160 },
          { name: "Хорголжин тэжээл", qty: 80 },
        ],
        eta: "8ц 15м",
        status: "pending",
        contact: "Терминал диспетчер +976 7011 2200",
      },
    ],
  },
  {
    id: "s7",
    trackingId: "RU-W-7782",
    cargo: "Хивэг, овьёосны хүрз (ОХУ)",
    origin: "Улаан-Үд, ОХУ",
    destination: "Эрдэнэт",
    driver: "Галт тэрэг бр. №21 — С. Петров",
    vehicleId: "ВАГОН-3318",
    status: "in_transit",
    route: route([51.834, 107.584], [50.4, 106.5], [49.8, 105.5], [49.0277, 104.0444]),
    progress: 0.15,
    speed: 55,
    eta: "12ц 40м",
    position: UB,
    type: "wagon",
    country: "RU",
    driverPhone: "+7 924 700 8899",
    driverLicense: "RZD-Class A",
    driverExperience: "16 жил",
    driverRating: 4.7,
    plateNumber: "ВАГОН-3318 / 3 вагон",
    capacity: "195 тн",
    shipper: "Сибирь-Агро",
    consignee: "Эрдэнэт Хүнс ХХК",
    shipperId: "cust-016",
    receiverId: "cust-004",
    totalWeight: "180 тн",
    cargoItems: [
      { name: "Хивэг (улаан буудайн)", qty: 120, note: "2 вагон" },
      { name: "Овьёосны хүрз", qty: 60, note: "1 вагон" },
    ],
    dropoffs: [
      {
        location: "Эрдэнэт — төмөр зам тавцан",
        position: [49.0277, 104.0444],
        items: [
          { name: "Хивэг", qty: 120 },
          { name: "Овьёосны хүрз", qty: 60 },
        ],
        eta: "12ц 40м",
        status: "pending",
      },
    ],
  },
  // Wagons from China
  {
    id: "s8",
    trackingId: "CN-W-9012",
    cargo: "Хорголжин тэжээл (БНХАУ)",
    origin: "Эрээн, БНХАУ",
    destination: "Улаанбаатар",
    driver: "Галт тэрэг бр. №07 — 王 Wang",
    vehicleId: "ВАГОН-5540",
    status: "in_transit",
    route: route(
      [43.6533, 111.9779],
      [43.7228, 111.8953],
      [44.5, 111.0],
      [45.5, 109.5],
      [47.0, 108.0],
      UB,
    ),
    progress: 0.58,
    speed: 62,
    eta: "6ц 05м",
    position: UB,
    type: "wagon",
    country: "CN",
    driverPhone: "+86 138 7000 4422",
    driverLicense: "CR-Class A",
    driverExperience: "12 жил",
    driverRating: 4.6,
    plateNumber: "ВАГОН-5540 / 5 вагон",
    capacity: "325 тн",
    shipper: "Inner Mongolia Feed Group",
    consignee: "Тэжээл Трейд ХХК",
    shipperId: "cust-017",
    receiverId: "cust-013",
    totalWeight: "300 тн",
    cargoItems: [
      { name: "Хорголжин тэжээл (premium)", qty: 200, note: "3 вагон" },
      { name: "Эрдэс/витамин premix", qty: 60, note: "1 вагон" },
      { name: "Малын давс block", qty: 40, note: "1 вагон" },
    ],
    dropoffs: [
      {
        location: "Замын-Үүд — гаалийн агуулах",
        position: [43.7228, 111.8953],
        items: [{ name: "Эрдэс/витамин premix", qty: 60 }],
        eta: "Гаалийн боловсруулалт",
        status: "done",
      },
      {
        location: "УБ — Толгойт терминал",
        position: UB,
        items: [
          { name: "Хорголжин тэжээл", qty: 200 },
          { name: "Малын давс", qty: 40 },
        ],
        eta: "6ц 05м",
        status: "pending",
      },
    ],
  },
  {
    id: "s9",
    trackingId: "CN-W-9013",
    cargo: "Soybean meal + premix (БНХАУ)",
    origin: "Тяньжин, БНХАУ",
    destination: "Дархан",
    driver: "Галт тэрэг бр. №31 — 李 Li",
    vehicleId: "ВАГОН-6677",
    status: "delayed",
    route: route(
      [39.3434, 117.3616],
      [42.0, 114.0],
      [43.7228, 111.8953],
      [45.5, 109.5],
      [47.0, 108.0],
      UB,
      [48.3, 106.85],
      [49.486, 105.962],
    ),
    progress: 0.41,
    speed: 38,
    eta: "22ц 10м",
    position: UB,
    type: "wagon",
    country: "CN",
    driverPhone: "+86 139 2200 5577",
    driverLicense: "CR-Class A",
    driverExperience: "9 жил",
    driverRating: 4.4,
    plateNumber: "ВАГОН-6677 / 4 вагон",
    capacity: "260 тн",
    shipper: "Tianjin Agro Export",
    consignee: "Дархан-Уул Тэжээл ХХК",
    shipperId: "cust-018",
    receiverId: "cust-002",
    totalWeight: "220 тн",
    cargoItems: [
      { name: "Шар буурцагны хүрз (soybean meal)", qty: 130, note: "2 вагон" },
      { name: "Эрдэс premix", qty: 50 },
      { name: "Хорголжин тэжээл", qty: 40 },
    ],
    dropoffs: [
      {
        location: "Замын-Үүд — гааль",
        position: [43.7228, 111.8953],
        items: [{ name: "Бүх ачаа — гаалийн үзлэг", qty: 220 }],
        eta: "Хоцрол: цаасан ажиллагаа",
        status: "done",
      },
      {
        location: "Дархан — Хүнсний агуулах",
        position: [49.486, 105.962],
        items: [
          { name: "Soybean meal", qty: 130 },
          { name: "Эрдэс premix", qty: 50 },
          { name: "Хорголжин тэжээл", qty: 40 },
        ],
        eta: "22ц 10м",
        status: "pending",
      },
    ],
  },
];

initialShipments.slice(0, 5).forEach((s) => {
  s.type = "truck";
  s.country = "MN";
});

// Default GPS state: trucks online, wagons "no GPS" (estimated by time).
initialShipments.forEach((s) => {
  s.gpsOnline = s.type !== "wagon";
  s.lastGpsAt = new Date().toISOString();
  s.lastKnownPos = s.position;
});

// Nearest point on a polyline (projects p onto each segment, returns closest).
export function nearestOnRoute(route: LatLng[], p: LatLng): { pos: LatLng; t: number } {
  let best = { pos: route[0], t: 0, d: Infinity };
  let acc = 0;
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
  }
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    let u = ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2;
    u = Math.max(0, Math.min(1, u));
    const px = ax + dx * u;
    const py = ay + dy * u;
    const d = Math.hypot(p[0] - px, p[1] - py);
    const segLen = Math.sqrt(len2);
    if (d < best.d) {
      best = { pos: [px, py], t: total > 0 ? (acc + segLen * u) / total : 0, d };
    }
    acc += segLen;
  }
  return { pos: best.pos, t: best.t };
}

export function pointOnRoute(route: LatLng[], t: number): LatLng {
  if (t <= 0) return route[0];
  if (t >= 1) return route[route.length - 1];
  const segs: { a: LatLng; b: LatLng; d: number }[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, d });
    total += d;
  }
  let target = t * total;
  for (const s of segs) {
    if (target <= s.d) {
      const r = target / s.d;
      return [s.a[0] + (s.b[0] - s.a[0]) * r, s.a[1] + (s.b[1] - s.a[1]) * r];
    }
    target -= s.d;
  }
  return route[route.length - 1];
}

initialShipments.forEach((s) => {
  s.position = pointOnRoute(s.route, s.progress);
});

// Fetch real road geometry from OSRM public demo server.
// Used client-side at app startup so polylines follow actual roads/rail corridors.
export async function fetchRoadRoute(waypoints: LatLng[]): Promise<LatLng[] | null> {
  try {
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: { geometry: { coordinates: [number, number][] } }[];
    };
    const coordsOut = json.routes?.[0]?.geometry?.coordinates;
    if (!coordsOut) return null;
    return coordsOut.map(([lng, lat]) => [lat, lng] as LatLng);
  } catch {
    return null;
  }
}
