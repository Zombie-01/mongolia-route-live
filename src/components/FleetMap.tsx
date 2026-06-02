import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  pointOnRoute,
  nearestOnRoute,
  haversineDist,
  fetchRoadRoute,
  type LatLng,
  type Shipment,
} from "@/lib/demo-data";
import type { Station } from "@/lib/store";

if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
}

function makeTruckIcon(s: Shipment, draggable: boolean) {
  const offline = !!(s.type !== "wagon" && s.gpsOnline === false);
  const cls =
    s.status === "stopped" || s.status === "delayed"
      ? "stopped"
      : s.status === "delivered"
        ? "delivered"
        : s.status === "empty"
          ? "empty"
          : s.status === "loading"
            ? "loading"
            : "";
  const emoji = s.type === "wagon" ? "🚆" : "🚚";
  const flag = s.country === "RU" ? "🇷🇺" : s.country === "CN" ? "🇨🇳" : "";
  const label = s.vehicleId || s.plateNumber || s.trackingId || "";
  const badge =
    s.type === "wagon"
      ? `<span style="position:absolute;top:-8px;left:-4px;background:#f59e0b;color:#000;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">EST</span>`
      : s.status === "empty"
        ? `<span style="position:absolute;top:-8px;left:-4px;background:#f59e0b;color:#000;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">ХООСОН</span>`
        : s.status === "loading"
          ? `<span style="position:absolute;top:-8px;left:-4px;background:#3b82f6;color:#fff;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">АЧАХ</span>`
          : offline
            ? `<span style="position:absolute;top:-8px;left:-4px;background:#ef4444;color:#fff;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">OFF</span>`
            : "";
  const ring = draggable
    ? "outline:2px dashed rgba(59,130,246,.7);outline-offset:3px;cursor:grab;"
    : "";
  // glow
  const online = s.type !== "wagon" && s.gpsOnline !== false;
  const glowStyle =
    s.type === "wagon"
      ? ""
      : s.status === "empty"
        ? "box-shadow:0 0 12px rgba(245,158,11,.9);"
        : s.status === "loading"
          ? "box-shadow:0 0 12px rgba(59,130,246,.9);"
          : online
            ? "box-shadow:0 0 10px rgba(16,185,129,.9);"
            : "box-shadow:0 0 10px rgba(239,68,68,.9);";
  const labelHtml = label
    ? `<div style="position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);min-width:28px;max-width:64px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;padding:1px 4px;background:rgba(0,0,0,.75);color:#fff;font-size:10px;line-height:1;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.25)">${label}</div>`
    : "";

  // Empty truck SVG with yellow wheels for "хоосон" status
  const emptyTruckHtml = `<svg viewBox="0 0 40 34" width="40" height="34" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="24" height="14" rx="2" fill="#64748b" stroke="#475569" stroke-width="1"/>
    <rect x="2" y="6" width="24" height="4" rx="1" fill="#94a3b8" stroke="#64748b" stroke-width="0.8"/>
    <rect x="26" y="10" width="12" height="12" rx="1" fill="#64748b" stroke="#475569" stroke-width="1"/>
    <line x1="6" y1="12" x2="22" y2="12" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2"/>
    <line x1="6" y1="16" x2="22" y2="16" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2"/>
    <line x1="6" y1="20" x2="22" y2="20" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2"/>
    <circle cx="10" cy="24" r="5" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
    <circle cx="10" cy="24" r="2" fill="#fef3c7"/>
    <circle cx="30" cy="24" r="5" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
    <circle cx="30" cy="24" r="2" fill="#fef3c7"/>
  </svg>`;

  // Loading SVG with cargo boxes and arrow for "ачих" status
  const loadingTruckHtml = `<svg viewBox="0 0 40 34" width="40" height="34" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="24" height="14" rx="2" fill="#64748b" stroke="#475569" stroke-width="1"/>
    <rect x="2" y="6" width="24" height="4" rx="1" fill="#94a3b8" stroke="#64748b" stroke-width="0.8"/>
    <rect x="26" y="10" width="12" height="12" rx="1" fill="#64748b" stroke="#475569" stroke-width="1"/>
    <rect x="6" y="11" width="6" height="6" rx="1" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.8"/>
    <rect x="13" y="9" width="6" height="8" rx="1" fill="#f59e0b" stroke="#d97706" stroke-width="0.8"/>
    <polygon points="18,4 14,8 22,8" fill="#3b82f6"/>
    <circle cx="10" cy="24" r="5" fill="#475569" stroke="#334155" stroke-width="1"/>
    <circle cx="10" cy="24" r="2" fill="#94a3b8"/>
    <circle cx="30" cy="24" r="5" fill="#475569" stroke="#334155" stroke-width="1"/>
    <circle cx="30" cy="24" r="2" fill="#94a3b8"/>
  </svg>`;

  // Determine inner content based on status
  const isTruckCustom = s.status === "empty" || s.status === "loading";
  let innerContent: string;
  if (s.status === "empty" && s.type !== "wagon") {
    innerContent = emptyTruckHtml;
  } else if (s.status === "loading" && s.type !== "wagon") {
    innerContent = loadingTruckHtml;
  } else {
    innerContent = `${emoji}${
      flag
        ? `<span style="position:absolute;bottom:-4px;right:-6px;font-size:12px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${flag}</span>`
        : ""
    }`;
  }

  return L.divIcon({
    className: "",
    iconSize: isTruckCustom ? [40, 34] : [40, 44],
    iconAnchor: isTruckCustom ? [20, 26] : [20, 18],
    html: `<div class="truck-marker ${cls}" style="${ring}${glowStyle}">${innerContent}${badge}${labelHtml}</div>`,
  });
}

function makeStopIcon(done: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<div style="width:16px;height:16px;border-radius:50%;border:2px solid ${done ? "#10b981" : "#3b82f6"};background:${done ? "rgba(16,185,129,.3)" : "rgba(59,130,246,.3)"};box-shadow:0 0 4px ${done ? "#10b981" : "#3b82f6"}"></div>`,
  });
}

/**
 * Densify a route by inserting intermediate points at a maximum interval.
 * This gives many more snap-able positions when dragging the train marker
 * and produces smoother animation through the coordinate array.
 */
function densifyRoute(route: LatLng[], maxIntervalMeters: number = 10000): LatLng[] {
  if (route.length < 2) return route;
  const result: LatLng[] = [route[0]];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const segLen = haversineDist(a, b);
    if (segLen <= maxIntervalMeters) {
      result.push(b);
      continue;
    }
    // Number of sub-segments to split into
    const steps = Math.ceil(segLen / maxIntervalMeters);
    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      result.push([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac] as LatLng);
    }
  }
  return result;
}

function isValidLatLng(pos: LatLng | [number, number]): pos is LatLng {
  return (
    Array.isArray(pos) && pos.length === 2 && Number.isFinite(pos[0]) && Number.isFinite(pos[1])
  );
}

function MapClickHandler({ onMapClick }: { onMapClick?: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

interface Props {
  shipments: Shipment[];
  stations?: Station[];
  focusId?: string;
  onSelect?: (id: string) => void;
  editable?: boolean;
  onDragEnd?: (id: string, pos: LatLng, progress?: number) => void;
  onMapClick?: (pos: LatLng) => void;
}

export function FleetMap({
  shipments,
  stations = [],
  focusId,
  onSelect,
  editable,
  onDragEnd,
  onMapClick,
}: Props) {
  const center = useMemo<[number, number]>(() => [47.9184, 106.9177], []);
  const [mounted, setMounted] = useState(false);
  const [railInterpolated, setRailInterpolated] = useState<Record<string, LatLng[]>>({});
  const [roadRoutes, setRoadRoutes] = useState<Record<string, LatLng[] | null>>({});
  // Store all parsed railway segments in a ref so they're available for snapping anytime
  const railSegmentsRef = useRef<LatLng[][]>([]);
  // Also store in state so they can be rendered as Polylines on the map
  const [railSegments, setRailSegments] = useState<LatLng[][]>([]);
  const [geoJsonLoaded, setGeoJsonLoaded] = useState(false);

  // Compute the correct wagon marker position by snapping each wagon's progress
  // to the detailed GeoJSON-interpolated railway route.
  // This ensures the train icon follows the full coordinate array of the track,
  // not just a straight line between origin and destination.
  const wagonPositions = useMemo(() => {
    const positions: Record<string, LatLng> = {};
    shipments.forEach((s) => {
      if (s.type === "wagon") {
        const route = railInterpolated[s.id];
        if (route && route.length >= 2) {
          positions[s.id] = pointOnRoute(route, s.progress);
        }
      }
    });
    return positions;
  }, [shipments, railInterpolated]);

  // Helper: snap a point to the nearest railway track across all segments
  const snapToRailway = useCallback((point: LatLng): LatLng => {
    const segs = railSegmentsRef.current;
    if (segs.length === 0) return point;
    let bestPoint = point;
    let bestDist = Infinity;
    for (const seg of segs) {
      if (seg.length < 2) continue;
      const result = nearestOnRoute(seg, point);
      if (result.d < bestDist) {
        bestDist = result.d;
        bestPoint = result.pos;
      }
    }
    return bestPoint;
  }, []);

  useEffect(() => setMounted(true), []);
  // Effect 1: Load railway GeoJSON once and parse segments
  useEffect(() => {
    fetch("/railway_routes.geojson")
      .then((res) => res.json())
      .then((data) => {
        // Pre-parse GeoJSON: extract all LineStrings into [lat, lng] arrays
        const segments: LatLng[][] = [];
        (data.features ?? []).forEach((f: any) => {
          if (f.geometry?.type === "LineString") {
            segments.push(f.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng));
          } else if (f.geometry?.type === "MultiLineString") {
            f.geometry.coordinates.forEach((line: number[][]) => {
              segments.push(line.map((c: number[]) => [c[1], c[0]] as LatLng));
            });
          }
        });
        // Densify raw GeoJSON segments so dragging has many snap points (~10km spacing)
        const densifiedSegments = segments.map((seg) => densifyRoute(seg, 10000));
        railSegmentsRef.current = densifiedSegments;
        setRailSegments(densifiedSegments);
        setGeoJsonLoaded(true);
      })
      .catch(() => {});
  }, []);

  // Effect 2: When GeoJSON loaded OR shipments change, recompute wagon interpolations
  useEffect(() => {
    if (!geoJsonLoaded) return;
    const segments = railSegmentsRef.current;
    if (segments.length === 0) return;

    // Interpolate wagon shipment routes along the railway
    const wagonRoutes: Record<string, LatLng[]> = {};
    shipments.forEach((s) => {
      if (s.type !== "wagon" || s.route.length < 2) return;
      const first = s.route[0];
      const last = s.route[s.route.length - 1];
      let bestSegment: LatLng[] | null = null;
      let bestScore = Infinity;
      for (let fi = 0; fi < segments.length; fi++) {
        const coords = segments[fi];
        let sd = Infinity,
          ed = Infinity;
        for (const c of coords) {
          sd = Math.min(sd, haversineDist(first, c));
          ed = Math.min(ed, haversineDist(last, c));
        }
        if (sd < 50000 && ed < 50000 && sd + ed < bestScore) {
          bestScore = sd + ed;
          bestSegment = coords;
        }
      }
      if (bestSegment) {
        let si = 0,
          ei = 0;
        let msd = Infinity,
          med = Infinity;
        bestSegment.forEach((c, i) => {
          const ds = haversineDist(first, c);
          if (ds < msd) {
            msd = ds;
            si = i;
          }
          const de = haversineDist(last, c);
          if (de < med) {
            med = de;
            ei = i;
          }
        });
        const forward = si <= ei;
        const a = forward ? si : ei;
        const b = forward ? ei : si;
        let route = bestSegment.slice(a, b + 1);
        if (!forward) route.reverse();
        if (route.length > 0) {
          route[0] = first;
          route[route.length - 1] = last;
        }
        // Densify the interpolated route so the train has many intermediate points for smooth dragging
        wagonRoutes[s.id] = densifyRoute(route, 10000);
      } else {
        // Fallback: densify original route (though it's a straight line)
        wagonRoutes[s.id] = densifyRoute(s.route, 10000);
      }
    });
    setRailInterpolated(wagonRoutes);
  }, [shipments, geoJsonLoaded]);

  useEffect(() => {
    const missing = shipments.filter(
      (s) =>
        s.type !== "wagon" &&
        !s.roadRoute &&
        !roadRoutes.hasOwnProperty(s.id) &&
        s.route.length >= 2,
    );
    if (missing.length === 0) return;

    missing.forEach(async (shipment) => {
      const route = await fetchRoadRoute(shipment.route);
      setRoadRoutes((prev) => ({ ...prev, [shipment.id]: route }));
    });
  }, [shipments, roadRoutes]);

  if (!mounted)
    return (
      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
        Газрын зураг ачаалж байна...
      </div>
    );
  return (
    <MapContainer
      center={center}
      zoom={6}
      className="h-full w-full"
      zoomControl={true}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

      {shipments.map((s) => {
        const isTruck = s.type !== "wagon";
        const effectiveRoute =
          s.type === "wagon"
            ? (railInterpolated[s.id] ?? s.route)
            : (s.roadRoute ?? roadRoutes[s.id] ?? s.route);
        const isFocus = focusId === s.id;
        const mainOpacity = isFocus ? 1 : focusId ? 0.25 : 0.85;

        // For "empty" status with a pickup route, draw two segments:
        // 1) Driver → pickup point (yellow, dashed)
        // 2) Pickup point → destination (green, dimmed - not yet active)
        if (s.status === "empty" && s.pickupRoute && s.pickupRoute.length >= 2) {
          const pickupEnd = s.pickupRoute[s.pickupRoute.length - 1];
          return (
            <>
              {/* Driver → Pickup point: solid yellow */}
              <Polyline
                key={`pu-${s.id}`}
                positions={s.pickupRoute}
                pathOptions={{
                  color: "#f59e0b",
                  weight: focusId === s.id ? 4 : 3,
                  opacity: mainOpacity,
                }}
              />
              {/* Pickup point → Destination: dimmed green/dashed */}
              <Polyline
                key={`r-${s.id}`}
                positions={effectiveRoute}
                pathOptions={{
                  color: "#10b981",
                  weight: focusId === s.id ? 3 : 2,
                  opacity: mainOpacity * 0.5,
                  dashArray: "6 6",
                }}
              />
            </>
          );
        }

        return (
          <Polyline
            key={`r-${s.id}`}
            positions={effectiveRoute}
            pathOptions={{
              color:
                s.status === "delayed"
                  ? "#f59e0b"
                  : s.status === "delivered"
                    ? "#6366f1"
                    : s.status === "empty"
                      ? "#f59e0b"
                      : s.status === "loading"
                        ? "#3b82f6"
                        : "#10b981",
              weight: focusId === s.id ? 4 : 2.5,
              opacity: isFocus ? 0.85 : focusId ? 0.25 : 0.85,
              dashArray: s.status === "delivered" ? "6 8" : undefined,
            }}
          />
        );
      })}
      {stations
        .filter((st) => isValidLatLng(st.position))
        .map((st) => (
          <CircleMarker
            key={`station-${st.id}`}
            center={st.position}
            radius={5}
            fillColor="#8b5cf6"
            color="#7c3aed"
            weight={2}
            opacity={0.8}
            fillOpacity={0.4}
          />
        ))}
      {shipments.map((s) =>
        s.dropoffs.map((d, i) => (
          <Marker
            key={`stop-${s.id}-${i}`}
            position={d.position}
            icon={makeStopIcon(d.status === "done")}
          />
        )),
      )}
      {shipments.map((s) => {
        // For wagons: override position with the correct GeoJSON-interpolated
        // position so the train icon follows every coordinate of the railway track.
        const markerPos =
          s.type === "wagon" && wagonPositions[s.id] ? wagonPositions[s.id] : s.position;

        return (
          <Marker
            key={s.id}
            position={markerPos}
            icon={makeTruckIcon(s, !!editable)}
            draggable={!!editable}
            eventHandlers={{
              click: () => onSelect?.(s.id),
              dragend: (e) => {
                if (!editable || !onDragEnd) return;
                const marker = e.target as L.Marker;
                const { lat, lng } = marker.getLatLng();
                const pt: LatLng = [lat, lng];
                if (s.type === "wagon") {
                  // For wagons: snap to railway track and calculate progress along GeoJSON route
                  const snap = snapToRailway(pt);
                  marker.setLatLng(snap);
                  // Calculate progress along the GeoJSON-interpolated route
                  const route = railInterpolated[s.id];
                  if (route && route.length >= 2) {
                    const snapResult = nearestOnRoute(route, snap);
                    onDragEnd(s.id, snapResult.pos, snapResult.t);
                  } else {
                    onDragEnd(s.id, snap);
                  }
                } else {
                  // For trucks: snap to road route
                  const path = s.roadRoute ?? roadRoutes[s.id] ?? s.route;
                  const snap = nearestOnRoute(path, pt);
                  marker.setLatLng(snap.pos);
                  onDragEnd(s.id, snap.pos);
                }
              },
            }}
          />
        );
      })}
    </MapContainer>
  );
}
