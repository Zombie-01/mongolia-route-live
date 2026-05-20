import type { LatLng } from "./demo-data";

export interface City {
  name: string;
  position: LatLng;
  country: "MN" | "RU" | "CN";
  rail?: boolean; // is on the Trans-Mongolian rail corridor
}

// Mongolia + key border/rail cities. Used for route waypoint suggestion + form selects.
export const CITIES: City[] = [
  // Mongolia — capital & aimag centers
  { name: "Улаанбаатар", position: [47.9184, 106.9177], country: "MN", rail: true },
  { name: "Налайх", position: [47.7728, 107.2509], country: "MN" },
  { name: "Зуунмод", position: [47.7053, 106.9531], country: "MN" },
  { name: "Багануур", position: [47.8276, 108.3514], country: "MN" },
  { name: "Дархан", position: [49.4861, 105.9622], country: "MN", rail: true },
  { name: "Эрдэнэт", position: [49.0277, 104.0444], country: "MN" },
  { name: "Сүхбаатар", position: [50.2361, 106.2114], country: "MN", rail: true },
  { name: "Чойр", position: [46.3602, 108.3614], country: "MN", rail: true },
  { name: "Сайншанд", position: [44.8956, 110.139], country: "MN", rail: true },
  { name: "Замын-Үүд", position: [43.7228, 111.8953], country: "MN", rail: true },
  { name: "Мандалговь", position: [45.7625, 106.2708], country: "MN" },
  { name: "Даланзадгад", position: [43.5708, 104.4256], country: "MN" },
  { name: "Арвайхээр", position: [46.2641, 102.7747], country: "MN" },
  { name: "Цэцэрлэг", position: [47.4769, 101.4533], country: "MN" },
  { name: "Тосонцэнгэл", position: [48.7444, 98.2722], country: "MN" },
  { name: "Улиастай", position: [47.7419, 96.8431], country: "MN" },
  { name: "Алтай", position: [46.3722, 96.2581], country: "MN" },
  { name: "Ховд", position: [48.0056, 91.6419], country: "MN" },
  { name: "Өлгий", position: [48.9686, 89.9622], country: "MN" },
  { name: "Улаангом", position: [49.9811, 92.0667], country: "MN" },
  { name: "Мөрөн", position: [49.6342, 100.1619], country: "MN" },
  { name: "Булган", position: [48.8125, 103.5347], country: "MN" },
  { name: "Хархорин", position: [47.1992, 102.8233], country: "MN" },
  { name: "Чойбалсан", position: [48.0717, 114.5372], country: "MN" },
  { name: "Өндөрхаан (Чингис)", position: [47.3225, 110.6553], country: "MN" },
  { name: "Барон-Урт", position: [46.6797, 113.2833], country: "MN" },
  { name: "Алтанбулаг", position: [50.3142, 106.4953], country: "MN", rail: true },
  { name: "Эрдэнэсант", position: [47.3197, 104.4861], country: "MN" },
  { name: "Лүн", position: [47.8633, 105.2017], country: "MN" },

  // Russia (rail neighbours)
  { name: "Наушки, ОХУ", position: [50.3833, 106.1167], country: "RU", rail: true },
  { name: "Улаан-Үд, ОХУ", position: [51.834, 107.584], country: "RU", rail: true },
  { name: "Иркутск, ОХУ", position: [52.2869, 104.305], country: "RU", rail: true },
  { name: "Кяхта, ОХУ", position: [50.3489, 106.4503], country: "RU", rail: true },

  // China (rail neighbours)
  { name: "Эрээн, БНХАУ", position: [43.6533, 111.9779], country: "CN", rail: true },
  { name: "Жинин (Jining), БНХАУ", position: [41.0286, 113.1106], country: "CN", rail: true },
  { name: "Хөх хот, БНХАУ", position: [40.8414, 111.7519], country: "CN", rail: true },
  { name: "Тяньжин, БНХАУ", position: [39.3434, 117.3616], country: "CN", rail: true },
  { name: "Бээжин, БНХАУ", position: [39.9042, 116.4074], country: "CN", rail: true },
];

export function findCity(name: string): City | undefined {
  return CITIES.find((c) => c.name === name);
}

// Suggest intermediate waypoints between origin and destination by picking
// cities that fall within a corridor along the straight line and ordering them.
export function suggestWaypoints(origin: LatLng, dest: LatLng, max = 4): LatLng[] {
  const [ox, oy] = origin;
  const [dx, dy] = dest;
  const vx = dx - ox;
  const vy = dy - oy;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return [];

  type Scored = { pos: LatLng; t: number; perp: number; name: string };
  const scored: Scored[] = CITIES.map((c) => {
    const [px, py] = c.position;
    const t = ((px - ox) * vx + (py - oy) * vy) / len2;
    const projX = ox + t * vx;
    const projY = oy + t * vy;
    const perp = Math.hypot(px - projX, py - projY);
    return { pos: c.position, t, perp, name: c.name };
  })
    // strictly between origin and destination, within ~80km perpendicular corridor
    .filter((s) => s.t > 0.05 && s.t < 0.95 && s.perp < 0.9)
    .sort((a, b) => a.perp - b.perp)
    .slice(0, max * 2);

  // Keep best by perpendicular, then re-sort by t (progress along line)
  return scored
    .sort((a, b) => a.t - b.t)
    .filter((s, i, arr) => i === 0 || s.t - arr[i - 1].t > 0.05)
    .slice(0, max)
    .map((s) => s.pos);
}

export function suggestRailWaypoints(origin: LatLng, dest: LatLng, max = 4): LatLng[] {
  const railCities = CITIES.filter((c) => c.rail);
  const [ox, oy] = origin;
  const [dx, dy] = dest;
  const vx = dx - ox;
  const vy = dy - oy;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return [];

  type Scored = { pos: LatLng; t: number; perp: number; name: string };
  const scored: Scored[] = railCities
    .map((c) => {
      const [px, py] = c.position;
      const t = ((px - ox) * vx + (py - oy) * vy) / len2;
      const projX = ox + t * vx;
      const projY = oy + t * vy;
      const perp = Math.hypot(px - projX, py - projY);
      return { pos: c.position, t, perp, name: c.name };
    })
    .filter((s) => s.t > 0.05 && s.t < 0.95 && s.perp < 0.9)
    .sort((a, b) => a.perp - b.perp)
    .slice(0, max * 2);

  return scored
    .sort((a, b) => a.t - b.t)
    .filter((s, i, arr) => i === 0 || s.t - arr[i - 1].t > 0.05)
    .slice(0, max)
    .map((s) => s.pos);
}

// Approx great-circle distance in km between two lat/lng points
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function totalRouteKm(route: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) total += distanceKm(route[i], route[i + 1]);
  return total;
}

export function etaFromKm(km: number, avgSpeed = 65): string {
  const hours = km / avgSpeed;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}ц ${m.toString().padStart(2, "0")}м`;
}
