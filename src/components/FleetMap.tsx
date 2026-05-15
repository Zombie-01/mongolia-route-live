import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { Shipment } from "@/lib/demo-data";

// Fix default icon URLs for bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

function makeTruckIcon(status: Shipment["status"]) {
  const cls = status === "stopped" || status === "delayed" ? "stopped" : status === "delivered" ? "delivered" : "";
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div class="truck-marker ${cls}">🚚</div>`,
  });
}

function FitBounds({ shipments, focusId }: { shipments: Shipment[]; focusId?: string }) {
  const map = useMap();
  useEffect(() => {
    if (focusId) {
      const s = shipments.find((x) => x.id === focusId);
      if (s) map.flyTo(s.position, 8, { duration: 1.2 });
      return;
    }
    if (!shipments.length) return;
    const bounds = L.latLngBounds(shipments.map((s) => s.position));
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [focusId, shipments, map]);
  return null;
}

interface Props {
  shipments: Shipment[];
  focusId?: string;
  onSelect?: (id: string) => void;
}

export function FleetMap({ shipments, focusId, onSelect }: Props) {
  const center = useMemo<[number, number]>(() => [47.9184, 106.9177], []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">Газрын зураг ачаалж байна…</div>;
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
      {shipments.map((s) => (
        <Polyline
          key={`r-${s.id}`}
          positions={s.route}
          pathOptions={{
            color: s.status === "delayed" ? "#f59e0b" : s.status === "delivered" ? "#6366f1" : "#10b981",
            weight: focusId === s.id ? 4 : 2.5,
            opacity: focusId && focusId !== s.id ? 0.25 : 0.85,
            dashArray: s.status === "delivered" ? "6 8" : undefined,
          }}
        />
      ))}
      {shipments.map((s) => (
        <Marker
          key={s.id}
          position={s.position}
          icon={makeTruckIcon(s.status)}
          eventHandlers={{ click: () => onSelect?.(s.id) }}
        />
      ))}
      <FitBounds shipments={shipments} focusId={focusId} />
    </MapContainer>
  );
}
