export type LatLng = [number, number];
export type ShipmentStatus =
  | "empty"
  | "loading"
  | "in_transit"
  | "stopped"
  | "delivered"
  | "delayed";
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
  note?: string;
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
  pickupRoute?: LatLng[]; // route from driver's current position to pickup point (origin), used when status=empty
  progress: number;
  speed: number;
  eta: string;
  position: LatLng;
  type?: VehicleType;
  country?: "MN" | "RU" | "CN";
  company?: string;

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
  createdAt?: string;
}

const UB: LatLng = [47.9184, 106.9177];
const route = (...pts: LatLng[]) => pts;

/** Haversine distance in meters between two lat/lng points */
export function haversineDist(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Nearest point on a polyline (projects p onto each segment, returns closest).
export function nearestOnRoute(route: LatLng[], p: LatLng): { pos: LatLng; t: number; d: number } {
  if (route.length === 0) return { pos: p, t: 0, d: 0 };
  let best = { pos: route[0], t: 0, d: Infinity };
  let acc = 0;
  let total = 0;
  // Use haversine for accurate distance
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineDist(route[i], route[i + 1]);
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
    const d = haversineDist(p, [px, py]);
    const segLen = haversineDist(route[i], route[i + 1]);
    if (d < best.d) {
      best = { pos: [px, py], t: total > 0 ? (acc + segLen * u) / total : 0, d };
    }
    acc += segLen;
  }
  return { pos: best.pos, t: best.t, d: best.d };
}

export function pointOnRoute(route: LatLng[], t: number): LatLng {
  if (route.length === 0) return [0, 0];
  if (t <= 0) return route[0];
  if (t >= 1) return route[route.length - 1];
  const segs: { a: LatLng; b: LatLng; d: number }[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const d = haversineDist(a, b);
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
