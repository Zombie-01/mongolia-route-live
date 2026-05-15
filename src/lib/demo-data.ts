export type LatLng = [number, number];
export type ShipmentStatus = "in_transit" | "stopped" | "delivered" | "delayed";

export interface Shipment {
  id: string;
  trackingId: string;
  cargo: string;
  origin: string;
  destination: string;
  driver: string;
  vehicleId: string;
  status: ShipmentStatus;
  route: LatLng[];
  progress: number; // 0..1 along route
  speed: number; // km/h (for display)
  eta: string;
  position: LatLng;
}

// Mongolia geography — Ulaanbaatar to regional cities
const UB: LatLng = [47.9184, 106.9177];

const route = (...pts: LatLng[]) => pts;

export const initialShipments: Shipment[] = [
  {
    id: "s1",
    trackingId: "MN-2041",
    cargo: "Барилгын материал",
    origin: "Улаанбаатар",
    destination: "Дархан",
    driver: "Б. Батбаяр",
    vehicleId: "УБА-9921",
    status: "in_transit",
    route: route(UB, [48.3, 106.85], [48.9, 106.3], [49.486, 105.962]),
    progress: 0.18,
    speed: 78,
    eta: "3ц 40м",
    position: UB,
  },
  {
    id: "s2",
    trackingId: "MN-2042",
    cargo: "Хүнсний бүтээгдэхүүн",
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
  },
  {
    id: "s3",
    trackingId: "MN-2043",
    cargo: "Цахилгаан хэрэгсэл",
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
  },
  {
    id: "s4",
    trackingId: "MN-2044",
    cargo: "Уул уурхайн тоног",
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
  },
  {
    id: "s5",
    trackingId: "MN-2045",
    cargo: "Хүргэлт - сав баглаа",
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
  },
];

// Linear interpolation helper for smooth movement along multi-segment routes
export function pointOnRoute(route: LatLng[], t: number): LatLng {
  if (t <= 0) return route[0];
  if (t >= 1) return route[route.length - 1];
  // compute total length (haversine-ish, but euclidean is fine for demo)
  const segs = [];
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

// Initialize positions
initialShipments.forEach((s) => {
  s.position = pointOnRoute(s.route, s.progress);
});
