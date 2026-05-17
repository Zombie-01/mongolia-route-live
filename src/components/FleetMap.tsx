import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { nearestOnRoute, type LatLng, type Shipment } from "@/lib/demo-data";

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
        : "";
  const emoji = s.type === "wagon" ? "🚆" : "🚚";
  const flag = s.country === "RU" ? "🇷🇺" : s.country === "CN" ? "🇨🇳" : "";
  const badge =
    s.type === "wagon"
      ? `<span style="position:absolute;top:-8px;left:-4px;background:#f59e0b;color:#000;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">EST</span>`
      : offline
        ? `<span style="position:absolute;top:-8px;left:-4px;background:#ef4444;color:#fff;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">OFF</span>`
        : "";
  const ring = draggable
    ? "outline:2px dashed rgba(59,130,246,.7);outline-offset:3px;cursor:grab;"
    : "";
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div class="truck-marker ${cls}" style="${ring}">${emoji}${
      flag
        ? `<span style="position:absolute;bottom:-4px;right:-6px;font-size:12px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${flag}</span>`
        : ""
    }${badge}</div>`,
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

function FitBounds({ shipments, focusId }: { shipments: Shipment[]; focusId?: string }) {
  const map = useMap();
  const lastFocus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (focusId && lastFocus.current !== focusId) {
      const s = shipments.find((x) => x.id === focusId);
      if (s) map.flyTo(s.position, 8, { duration: 1.2 });
      lastFocus.current = focusId;
      return;
    }
    if (!focusId && lastFocus.current !== undefined) {
      lastFocus.current = undefined;
      if (!shipments.length) return;
      const bounds = L.latLngBounds(shipments.map((s) => s.position));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
    if (!focusId && lastFocus.current === undefined && shipments.length) {
      const bounds = L.latLngBounds(shipments.map((s) => s.position));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [focusId, shipments, map]);
  return null;
}

interface Props {
  shipments: Shipment[];
  focusId?: string;
  onSelect?: (id: string) => void;
  editable?: boolean;
  onDragEnd?: (id: string, pos: LatLng) => void;
}

export function FleetMap({ shipments, focusId, onSelect, editable, onDragEnd }: Props) {
  const center = useMemo<[number, number]>(() => [47.9184, 106.9177], []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
        Газрын зураг ачаалж байна...
      </div>
    );
  return (
    <MapContainer center={center} zoom={6} className="h-full w-full" zoomControl={true} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shipments.map((s) => (
        <Polyline
          key={`r-${s.id}`}
          positions={s.roadRoute ?? s.route}
          pathOptions={{
            color: s.status === "delayed" ? "#f59e0b" : s.status === "delivered" ? "#6366f1" : "#10b981",
            weight: focusId === s.id ? 4 : 2.5,
            opacity: focusId && focusId !== s.id ? 0.25 : 0.85,
            dashArray: s.status === "delivered" ? "6 8" : undefined,
          }}
        />
      ))}
      {/* Stop markers along route */}
      {shipments.map((s) =>
        s.dropoffs.map((d, i) => (
          <Marker
            key={`stop-${s.id}-${i}`}
            position={d.position}
            icon={makeStopIcon(d.status === "done")}
          />
        )),
      )}
      {shipments.map((s) => (
        <Marker
          key={s.id}
          position={s.position}
          icon={makeTruckIcon(s, !!editable)}
          draggable={!!editable}
          eventHandlers={{
            click: () => onSelect?.(s.id),
            dragend: (e) => {
              if (!editable || !onDragEnd) return;
              const marker = e.target as L.Marker;
              const { lat, lng } = marker.getLatLng();
              const path = s.roadRoute ?? s.route;
              const snap = nearestOnRoute(path, [lat, lng]);
              marker.setLatLng(snap.pos);
              onDragEnd(s.id, snap.pos);
            },
          }}
        />
      ))}
      <FitBounds shipments={shipments} focusId={focusId} />
    </MapContainer>
  );
}
