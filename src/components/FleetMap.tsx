import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
  CircleMarker,
  useMapEvents,
  GeoJSON,
} from "react-leaflet";
import L from "leaflet";
import { nearestOnRoute, type LatLng, type Shipment } from "@/lib/demo-data";
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
        : "";
  const emoji = s.type === "wagon" ? "🚆" : "🚚";
  const flag = s.country === "RU" ? "🇷🇺" : s.country === "CN" ? "🇨🇳" : "";
  const label = s.vehicleId || s.plateNumber || s.trackingId || "";
  const badge =
    s.type === "wagon"
      ? `<span style="position:absolute;top:-8px;left:-4px;background:#f59e0b;color:#000;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">EST</span>`
      : offline
        ? `<span style="position:absolute;top:-8px;left:-4px;background:#ef4444;color:#fff;font-size:8px;padding:1px 4px;border-radius:6px;font-weight:700">OFF</span>`
        : "";
  const ring = draggable
    ? "outline:2px dashed rgba(59,130,246,.7);outline-offset:3px;cursor:grab;"
    : "";
  // glow: green when online, red when offline (wagons get no glow)
  const online = s.type !== "wagon" && s.gpsOnline !== false;
  const glowStyle =
    s.type === "wagon"
      ? ""
      : online
        ? "box-shadow:0 0 10px rgba(16,185,129,.9);"
        : "box-shadow:0 0 10px rgba(239,68,68,.9);";
  const labelHtml = label
    ? `<div style="position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);min-width:28px;max-width:64px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;padding:1px 4px;background:rgba(0,0,0,.75);color:#fff;font-size:10px;line-height:1;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.25)">${label}</div>`
    : "";

  return L.divIcon({
    className: "",
    iconSize: [40, 44],
    iconAnchor: [20, 18],
    html: `<div class="truck-marker ${cls}" style="${ring}${glowStyle}">${emoji}${
      flag
        ? `<span style="position:absolute;bottom:-4px;right:-6px;font-size:12px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${flag}</span>`
        : ""
    }${badge}${labelHtml}</div>`,
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

function isValidLatLng(pos: LatLng | [number, number]): pos is LatLng {
  return (
    Array.isArray(pos) && pos.length === 2 && Number.isFinite(pos[0]) && Number.isFinite(pos[1])
  );
}

function FitBounds() {
  // No automatic camera movement. Keep the current user view steady while the map updates.
  return null;
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
  onDragEnd?: (id: string, pos: LatLng) => void;
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
  const [railGeoJson, setRailGeoJson] = useState<any>(null);
  const hasWagonShipment = useMemo(() => shipments.some((s) => s.type === "wagon"), [shipments]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    fetch("/mongolia_russia_railway.geojson")
      .then((res) => res.json())
      .then(setRailGeoJson)
      .catch(() => setRailGeoJson(null));
  }, []);

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
      {railGeoJson && (
        <GeoJSON data={railGeoJson} style={{ color: "#7c3aed", weight: 2, opacity: 0.35 }} />
      )}
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      {shipments.map((s) => (
        <Polyline
          key={`r-${s.id}`}
          positions={s.type === "wagon" ? s.route : (s.roadRoute ?? s.route)}
          pathOptions={{
            color:
              s.status === "delayed" ? "#f59e0b" : s.status === "delivered" ? "#6366f1" : "#10b981",
            weight: focusId === s.id ? 4 : 2.5,
            opacity: focusId && focusId !== s.id ? 0.25 : 0.85,
            dashArray: s.status === "delivered" ? "6 8" : undefined,
          }}
        />
      ))}
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
              const path = s.type === "wagon" ? s.route : (s.roadRoute ?? s.route);
              const snap = nearestOnRoute(path, [lat, lng]);
              marker.setLatLng(snap.pos);
              onDragEnd(s.id, snap.pos);
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
