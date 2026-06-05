import { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng, Shipment } from "@/lib/demo-data";

/**
 * Calculate the circular offset for a marker within a packed cluster
 * @param index Current marker index in the cluster
 * @param total Total markers in the cluster
 * @param radius Distance from center in pixels
 */
function getPackedOffset(index: number, total: number, radius = 25) {
  const angle = (index / total) * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

interface PackedMarkersState {
  [shipmentId: string]: LatLng;
}

/**
 * Hook that spreads overlapping markers in a circular pattern
 * Groups markers by cell location and distributes them around the cluster center
 */
export function usePackedMarkers(
  shipments: Shipment[],
  wagonPositions: Record<string, LatLng>,
): PackedMarkersState {
  const map = useMap();
  const [packedPositions, setPackedPositions] = useState<PackedMarkersState>({});
  const lastZoomRef = useRef<number>(map.getZoom());

  const computePackedPositions = useMemo(
    () => () => {
      const CELL_SIZE = 40; // pixels
      const positions: PackedMarkersState = {};
      const cellMap: Record<string, Shipment[]> = {};

      // Group shipments by cell
      shipments.forEach((s) => {
        const markerPos =
          s.type === "wagon" && wagonPositions[s.id] ? wagonPositions[s.id] : s.position;

        // Convert to pixel coordinates
        const point = map.latLngToLayerPoint(L.latLng(markerPos[0], markerPos[1]));

        // Calculate cell key
        const cellX = Math.floor(point.x / CELL_SIZE);
        const cellY = Math.floor(point.y / CELL_SIZE);
        const cellKey = `${cellX}:${cellY}`;

        if (!cellMap[cellKey]) {
          cellMap[cellKey] = [];
        }
        cellMap[cellKey].push(s);
      });

      // Process each cell
      Object.entries(cellMap).forEach(([_cellKey, cellShipments]) => {
        cellShipments.forEach((s, index) => {
          // Single marker - use original position
          if (cellShipments.length === 1) {
            const markerPos =
              s.type === "wagon" && wagonPositions[s.id] ? wagonPositions[s.id] : s.position;
            positions[s.id] = markerPos;
            return;
          }

          // Multiple markers - spread them in a circle
          const markerPos =
            s.type === "wagon" && wagonPositions[s.id] ? wagonPositions[s.id] : s.position;

          const centerPoint = map.latLngToLayerPoint(L.latLng(markerPos[0], markerPos[1]));

          // Calculate radius based on cluster size to match visual design
          // Larger clusters get bigger radius, but cap at max radius
          const baseRadius = 50;
          const maxRadius = 120;
          const radius = Math.min(baseRadius + Math.floor(index / 8) * 30, maxRadius);

          // Get offset for this marker
          const offset = getPackedOffset(index, cellShipments.length, radius);

          // Apply offset to get new pixel point
          const newPoint = L.point(centerPoint.x + offset.x, centerPoint.y + offset.y);

          // Convert back to LatLng
          const packedLatLng = map.layerPointToLatLng(newPoint);
          positions[s.id] = [packedLatLng.lat, packedLatLng.lng];
        });
      });

      return positions;
    },
    [map, shipments, wagonPositions],
  );

  // Recompute positions on zoom/pan
  useEffect(() => {
    const handleZoom = () => {
      setPackedPositions(computePackedPositions());
    };

    const handleMove = () => {
      setPackedPositions(computePackedPositions());
    };

    map.on("zoom", handleZoom);
    map.on("move", handleMove);

    // Initial computation
    setPackedPositions(computePackedPositions());

    return () => {
      map.off("zoom", handleZoom);
      map.off("move", handleMove);
    };
  }, [map, computePackedPositions]);

  return packedPositions;
}
