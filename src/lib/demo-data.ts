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

function distance(a: LatLng, b: LatLng) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function chainRailSegments(segments: LatLng[][], origin: LatLng, destination: LatLng): LatLng[] {
  if (segments.length === 0) return [];
  const used = new Array(segments.length).fill(false);
  const normalize = (segment: LatLng[]) => segment.slice();
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.length === 0) continue;
    const startDist = distance(seg[0], origin);
    const endDist = distance(seg[seg.length - 1], origin);
    const d = Math.min(startDist, endDist);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  let route = normalize(segments[bestIndex]);
  if (distance(route[route.length - 1], origin) < distance(route[0], origin)) {
    route.reverse();
  }
  used[bestIndex] = true;

  let appended = true;
  while (appended) {
    appended = false;
    const lastPoint = route[route.length - 1];
    for (let i = 0; i < segments.length; i++) {
      if (used[i]) continue;
      const seg = normalize(segments[i]);
      const startDist = distance(seg[0], lastPoint);
      const endDist = distance(seg[seg.length - 1], lastPoint);
      if (startDist < 0.0005 || endDist < 0.0005) {
        if (endDist < startDist) seg.reverse();
        route = route.concat(seg.slice(1));
        used[i] = true;
        appended = true;
        break;
      }
    }
  }

  const first = route[0];
  const last = route[route.length - 1];
  if (distance(first, origin) > 0.001) {
    route = [origin, ...route];
  }
  if (distance(last, destination) > 0.001) {
    route = [...route, destination];
  }

  return route;
}

// Fetch live railway line geometry from OpenStreetMap Overpass API.
export async function fetchRailwayRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): Promise<LatLng[] | null> {
  try {
    const minLat = Math.min(startLat, endLat) - 0.1;
    const maxLat = Math.max(startLat, endLat) + 0.1;
    const minLng = Math.min(startLng, endLng) - 0.1;
    const maxLng = Math.max(startLng, endLng) + 0.1;
    const query = `
      [out:json][timeout:25];
      (
        way["railway"="rail"](${minLat},${minLng},${maxLat},${maxLng});
      );
      out geom;
    `;
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      elements?: Array<{ geometry?: Array<{ lat: number; lon: number }> }>;
    };
    const lines = (data.elements ?? [])
      .map((element) => element.geometry ?? [])
      .filter((geom) => geom.length > 0)
      .map((geom) => geom.map((pt) => [pt.lat, pt.lon] as LatLng));
    if (lines.length === 0) return null;
    return chainRailSegments(lines, [startLat, startLng], [endLat, endLng]);
  } catch {
    return null;
  }
}
