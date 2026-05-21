import { useEffect, useMemo, useRef, useState } from "react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import type { LatLngExpression } from "leaflet";
import type { Shipment, LatLng } from "@/lib/demo-data";
import { nearestOnRoute } from "@/lib/demo-data";

// Read Google API key from environment (Vite: VITE_GOOGLE_MAPS_API_KEY). Falls back to Node env.
const ENV_GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";

type RailRouteMapProps = {
  initialCenter?: LatLng;
  initialZoom?: number;
  overpassUrl?: string;
  shipments?: Shipment[];
  routes?: LatLng[][];
  focusId?: string;
  onSelect?: (id: string) => void;
  editable?: boolean;
  onDragEnd?: (id: string, pos: LatLng) => void;
  googleMapsApiKey?: string;
};

type ComputedSegment = {
  id: string;
  status?: Shipment["status"];
  route: LatLng[];
  position?: LatLng;
  segments: LatLng[][];
};

function haversineDistance(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const r = 6371e3;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x = sinDLat * sinDLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLon * sinDLon;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Decode an encoded polyline string (Google encoded polyline algorithm)
function decodePolyline(str: string): LatLng[] {
  const coords: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// Use Google Routes API transit routing between two points and return LatLng[] polyline
async function fetchGoogleTransitRoute(
  start: LatLng,
  end: LatLng,
  apiKey: string,
): Promise<LatLng[] | null> {
  if (!apiKey) return null;
  try {
    const url = `https://routes.googleapis.com/v2:computeRoutes?key=${encodeURIComponent(apiKey)}`;
    const body = {
      origin: { latLng: { latitude: start[0], longitude: start[1] } },
      destination: { latLng: { latitude: end[0], longitude: end[1] } },
      travelMode: "TRANSIT",
      polylineQuality: "OVERVIEW",
      polylineEncoding: "ENCODED_POLYLINE",
      routingPreference: "TRAFFIC_UNAWARE",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const routes = json.routes ?? [];
    if (!routes || routes.length === 0) return null;
    const poly = routes[0].polyline?.encodedPolyline || routes[0].polyline?.polyline || null;
    const encoded = typeof poly === "string" ? poly : poly?.encodedPolyline;
    if (!encoded) return null;
    const coords = decodePolyline(encoded);
    return coords;
  } catch (err) {
    console.warn("Google Transit route fetch failed:", err);
    return null;
  }
}

// Үндсэн цэвэрлэсэн GeoJSON-оос тухайн ачааны цэгүүдэд тохирох хэсэг шугамыг хурдан зүсэж авах функц
function extractSubRoute(start: LatLng, end: LatLng, geojson: any): LatLng[] {
  if (!geojson || !geojson.features || geojson.features.length === 0) {
    return [start, end];
  }

  // Олон жижиг хэсгүүдийг нэг урт координатын массив болгож нэгтгэх
  let allCoords: LatLng[] = [];
  geojson.features.forEach((f: any) => {
    if (f.geometry.type === "LineString") {
      allCoords.push(...f.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng));
    } else if (f.geometry.type === "MultiLineString") {
      f.geometry.coordinates.forEach((line: number[][]) => {
        allCoords.push(...line.map((c: number[]) => [c[1], c[0]] as LatLng));
      });
    }
  });

  if (allCoords.length < 2) return [start, end];

  // Эхлэл ба төгсгөл цэгт хамгийн ойр байгаа индексүүдийг олох
  let startIdx = 0;
  let endIdx = 0;
  let minDistStart = Infinity;
  let minDistEnd = Infinity;

  allCoords.forEach((coord, idx) => {
    const dStart = haversineDistance(start, coord);
    if (dStart < minDistStart) {
      minDistStart = dStart;
      startIdx = idx;
    }
    const dEnd = haversineDistance(end, coord);
    if (dEnd < minDistEnd) {
      minDistEnd = dEnd;
      endIdx = idx;
    }
  });

  // Индексүүдийн дарааллыг зөв болгож зүсэж авах
  const reverse = startIdx > endIdx;
  const sliceStart = reverse ? endIdx : startIdx;
  const sliceEnd = reverse ? startIdx : endIdx;

  let subRoute = allCoords.slice(sliceStart, sliceEnd + 1);
  if (reverse) subRoute.reverse();

  // Илүү нарийвчлалтай болгохын тулд эхлэл төгсгөлийг нь яг ачааны цэгтэй нь холбож өгнө
  if (subRoute.length > 0) {
    subRoute[0] = start;
    subRoute[subRoute.length - 1] = end;
  } else {
    subRoute = [start, end];
  }

  return subRoute;
}

// Зассан цэвэр Төмөр замын маршрут татагч API дуудлага
async function fetchRailwayData() {
  // ArcGIS Open Data API - world railroads (GeoJSON)
  const arcgisUrl =
    "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Railroads/FeatureServer/0/query";

  const params = new URLSearchParams({
    where: "CNTRY_NAME = 'Mongolia'",
    outFields: "OBJECTID,RTE_NAME,CNTRY_NAME",
    f: "geojson",
  });

  const res = await fetch(`${arcgisUrl}?${params.toString()}`);
  if (!res.ok) throw new Error("ArcGIS API-аас хариу авч чадсангүй эсвэл хандалт татгалзлаа.");
  const geojson = await res.json();
  return geojson;
}

// Map click handling is implemented on the google.maps.Map instance inside GoogleMapInner.
// Removed Leaflet `useMapEvents` helper which is not used anymore.

// Helper to render a simple emoji label for Google markers
function markerLabelForShipment(s: Shipment) {
  return s.vehicleId || s.trackingId || "";
}

export function RailRouteMap({
  initialCenter = [47.9184, 106.9177],
  initialZoom = 6,
  shipments,
  routes,
  focusId,
  onSelect,
  editable,
  onDragEnd,
  // optional API key for Google Maps; if not provided, read from env (`VITE_GOOGLE_MAPS_API_KEY`)
  googleMapsApiKey = ENV_GOOGLE_MAPS_API_KEY,
}: RailRouteMapProps) {
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<LatLng | null>(null);
  const [computedRoutes, setComputedRoutes] = useState<ComputedSegment[]>([]);
  const [railwayGeoJSON, setRailwayGeoJSON] = useState<any>(null);
  const [railwayLoading, setRailwayLoading] = useState(true);
  const [useTransitLayer, setUseTransitLayer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeSources = useMemo(() => {
    if (Array.isArray(shipments) && shipments.length > 0) {
      return shipments
        .filter((shipment) => shipment.type === "wagon")
        .map((shipment) => ({
          id: shipment.id,
          status: shipment.status,
          route: shipment.route,
          position: shipment.position,
        }));
    }
    if (Array.isArray(routes) && routes.length > 0) {
      return routes.map((route, index) => ({
        id: `route-${index}`,
        route,
        segments: [] as LatLng[][],
      }));
    }
    return [];
  }, [routes, shipments]);

  const hasRouteSources = routeSources.length > 0;

  // Эхлээд олон улсын үндсэн цэвэр төмөр замаа API-аас нэг удаа татаж авна
  useEffect(() => {
    async function fetchTransMongolianRoute() {
      setRailwayLoading(true);
      try {
        const geojson = await fetchRailwayData();
        setRailwayGeoJSON(geojson);
        setUseTransitLayer(false);
      } catch (err) {
        console.error("Төмөр замын датаг татаж чадсангүй:", err);
        // Fall back to Google Maps TransitLayer visual overlay (no vector data)
        setRailwayGeoJSON(null);
        setUseTransitLayer(true);
      } finally {
        setRailwayLoading(false);
      }
    }
    fetchTransMongolianRoute();
  }, []);

  // Төмөр замын дата ирсний дараа, эсвэл цэг өөрчлөгдөхөд замыг маш хурдан зүсэж зурах логик
  useEffect(() => {
    const hasManualPoints = startPoint && endPoint;
    if (!hasRouteSources && !hasManualPoints) {
      setComputedRoutes([]);
      setLoading(false);
      return;
    }

    // Хэрэв үндсэн замын дата хараахан ирээгүй бол түр хүлээх эсвэл шулуун зурах
    if (railwayLoading && !railwayGeoJSON) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const computed: ComputedSegment[] = [];

        // 1. BЭЛЭН ДАТА (Shipments) орж ирсэн үед
        if (hasRouteSources) {
          for (const source of routeSources) {
            const segments: LatLng[][] = [];
            if (source.route.length < 2) {
              if (source.route.length > 0) segments.push(source.route);
              computed.push({ ...source, segments });
              continue;
            }

            for (let i = 1; i < source.route.length; i++) {
              const from = source.route[i - 1];
              const to = source.route[i];
              let subRoute: LatLng[] = [];

              if (railwayGeoJSON) {
                subRoute = extractSubRoute(from, to, railwayGeoJSON);
              } else if (googleMapsApiKey) {
                // attempt Google Transit route for this segment
                const g = await fetchGoogleTransitRoute(from, to, googleMapsApiKey);
                if (g && g.length > 0) subRoute = g;
                else subRoute = [from, to];
              } else {
                subRoute = [from, to];
              }

              segments.push(subRoute);
            }
            computed.push({ ...source, segments });
          }
        }
        // 2. ГАРААР КЛИК ХИЙЖ ЦЭГ СОНГОСОН ҮЕД
        else if (startPoint && endPoint) {
          let subRoute: LatLng[] = [];
          if (railwayGeoJSON) {
            subRoute = extractSubRoute(startPoint, endPoint, railwayGeoJSON);
          } else if (googleMapsApiKey) {
            const g = await fetchGoogleTransitRoute(startPoint, endPoint, googleMapsApiKey);
            subRoute = g && g.length > 0 ? g : [startPoint, endPoint];
          } else {
            subRoute = [startPoint, endPoint];
          }
          computed.push({
            id: "manual-click-route",
            route: [startPoint, endPoint],
            segments: [subRoute],
          });
        }

        setComputedRoutes(computed);
      } catch (err) {
        setError("Маршрутыг рельс дээр буулгахад алдаа гарлаа.");
        if (startPoint && endPoint) {
          setComputedRoutes([
            {
              id: "manual-click-route",
              route: [startPoint, endPoint],
              segments: [[startPoint, endPoint]],
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [hasRouteSources, routeSources, startPoint, endPoint, railwayGeoJSON, railwayLoading]);

  const handleMapClick = (position: LatLng) => {
    if (hasRouteSources) return;

    if (!startPoint) {
      setStartPoint(position);
      setEndPoint(null);
      setComputedRoutes([]);
      setError(null);
      return;
    }

    if (!endPoint) {
      setEndPoint(position);
      return;
    }

    setStartPoint(position);
    setEndPoint(null);
    setComputedRoutes([]);
    setError(null);
  };
  // Google Maps rendering: inner component that creates a `google.maps.Map` once API loads
  function GoogleMapInner() {
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const dataLayerRef = useRef<google.maps.Data | null>(null);
    const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
    const polylineRefs = useRef<google.maps.Polyline[]>([]);
    const markerRefs = useRef<google.maps.Marker[]>([]);

    // instantiate map
    useEffect(() => {
      if (!mapDivRef.current || mapRef.current) return;
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: { lat: initialCenter[0], lng: initialCenter[1] },
        zoom: initialZoom,
        mapTypeId: "roadmap",
        disableDefaultUI: false,
      });

      // attach click listener for manual route selection
      mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        handleMapClick([e.latLng.lat(), e.latLng.lng()]);
      });
    }, [initialCenter, initialZoom]);

    // draw/remove base railway GeoJSON using google.maps.Data
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      // clear previous data layer and transit layer
      if (dataLayerRef.current) {
        dataLayerRef.current.setMap(null);
        dataLayerRef.current = null;
      }
      if (transitLayerRef.current) {
        transitLayerRef.current.setMap(null);
        transitLayerRef.current = null;
      }

      if (railwayGeoJSON) {
        const data = new google.maps.Data({ map });
        try {
          data.addGeoJson(railwayGeoJSON as any);
        } catch (err) {
          console.error("Invalid GeoJSON for google.maps.Data:", err);
        }
        data.setStyle({
          strokeColor: "#3f3f46",
          strokeWeight: 2,
          strokeOpacity: 0.4,
        });
        dataLayerRef.current = data;
      } else if (useTransitLayer) {
        // show Google Maps built-in transit overlay if we don't have vector data
        const t = new google.maps.TransitLayer();
        t.setMap(map);
        transitLayerRef.current = t;
      }
    }, [railwayGeoJSON]);

    // draw computed route segments as polylines; fit bounds so they're visible
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      // remove existing polylines
      polylineRefs.current.forEach((p) => p.setMap(null));
      polylineRefs.current = [];

      const bounds = new google.maps.LatLngBounds();
      let haveAny = false;

      computedRoutes.forEach((source) => {
        source.segments.forEach((segment) => {
          const path = segment.map((s) => ({ lat: s[0], lng: s[1] }));
          if (path.length === 0) return;
          const poly = new google.maps.Polyline({
            path,
            map,
            strokeColor: focusId === source.id ? "#34d399" : "#10b981",
            strokeOpacity: focusId && focusId !== source.id ? 0.3 : 0.9,
            strokeWeight: focusId === source.id ? 5 : 3,
            clickable: false,
            zIndex: 5,
          });
          polylineRefs.current.push(poly);
          // extend bounds for visibility
          path.forEach((p) => bounds.extend(p));
          haveAny = true;
        });
      });

      // fallback dashed straight line when computing
      if (!railwayLoading && computedRoutes.length === 0 && startPoint && endPoint) {
        const straightPath = [
          { lat: startPoint[0], lng: startPoint[1] },
          { lat: endPoint[0], lng: endPoint[1] },
        ];
        const straight = new google.maps.Polyline({
          path: straightPath,
          map,
          strokeColor: "#3b82f6",
          strokeOpacity: 0.6,
          strokeWeight: 2,
          icons: [
            {
              icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 },
              offset: "0",
              repeat: "10px",
            },
          ],
        });
        polylineRefs.current.push(straight);
        straightPath.forEach((p) => bounds.extend(p));
        haveAny = true;
      }

      if (haveAny) {
        try {
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 } as any);
        } catch (e) {
          // ignore fitBounds errors
        }
      }

      return () => {
        polylineRefs.current.forEach((p) => p.setMap(null));
        polylineRefs.current = [];
      };
    }, [computedRoutes, railwayLoading, focusId, startPoint, endPoint]);

    // markers for shipments and stops
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      // clear previous markers
      markerRefs.current.forEach((m) => m.setMap(null));
      markerRefs.current = [];

      if (!shipments) return;

      shipments.forEach((shipment) => {
        // For wagons: do not draw raw route; instead snap marker to computed route segments when available
        if (shipment.type === "wagon") {
          // try to find computedSegments for this shipment
          const computed = computedRoutes.find((c) => c.id === shipment.id);
          let routePoints: LatLng[] | null = null;
          if (computed && computed.segments && computed.segments.length > 0) {
            // flatten segments into a single route array
            routePoints = computed.segments.flat();
          } else if (Array.isArray(shipment.route) && shipment.route.length > 0) {
            routePoints = shipment.route;
          }

          // determine marker position: snap to routePoints if available, otherwise use shipment.position
          let markerPos = { lat: shipment.position[0], lng: shipment.position[1] };
          if (routePoints) {
            const snap = nearestOnRoute(routePoints, shipment.position);
            markerPos = { lat: snap.pos[0], lng: snap.pos[1] };
          }

          const m = new google.maps.Marker({
            position: markerPos,
            map,
            draggable: !!editable,
            title: markerLabelForShipment(shipment) || shipment.id,
            label: {
              text: "🚆",
              fontSize: "16px",
            } as any,
          });

          m.addListener("click", () => onSelect?.(shipment.id));

          if (editable && onDragEnd && routePoints) {
            m.addListener("dragend", () => {
              const pos = m.getPosition();
              if (!pos) return;
              const snap = nearestOnRoute(routePoints as LatLng[], [pos.lat(), pos.lng()]);
              m.setPosition(new google.maps.LatLng(snap.pos[0], snap.pos[1]));
              onDragEnd(shipment.id, snap.pos);
            });
          }
          markerRefs.current.push(m);
        } else {
          // non-wagon: draw their raw route as before
          const rawRoute = shipment.roadRoute ?? shipment.route;
          if (rawRoute && rawRoute.length > 0) {
            const googlePath = rawRoute.map((pos) => ({ lat: pos[0], lng: pos[1] }));
            const routeColor =
              shipment.status === "delayed"
                ? "#f59e0b"
                : shipment.status === "delivered"
                  ? "#6366f1"
                  : "#10b981";

            const polyline = new google.maps.Polyline({
              path: googlePath,
              geodesic: true,
              strokeColor: routeColor,
              strokeOpacity: 0.85,
              strokeWeight: 3,
              map,
            });
            polylineRefs.current.push(polyline);
          }

          // draw marker for non-wagon
          const markerPosition = { lat: shipment.position[0], lng: shipment.position[1] };
          const emoji = shipment.type === "wagon" ? "🚆" : "🚚";
          const marker = new google.maps.Marker({
            position: markerPosition,
            map: map,
            title: shipment.vehicleId || "Asset",
            label: {
              text: emoji,
              fontSize: "20px",
            },
          });
          markerRefs.current.push(marker);
        }

        // dropoffs
        shipment.dropoffs.forEach((dropoff) => {
          const stop = new google.maps.Marker({
            position: { lat: dropoff.position[0], lng: dropoff.position[1] },
            map,
            clickable: false,
            title: dropoff.status,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: dropoff.status === "done" ? "#10b981" : "#3b82f6",
              fillOpacity: 0.6,
              strokeColor: dropoff.status === "done" ? "#10b981" : "#3b82f6",
              strokeWeight: 2,
              scale: 6,
            } as any,
          });
          markerRefs.current.push(stop);
        });
      });

      return () => {
        markerRefs.current.forEach((m) => m.setMap(null));
        markerRefs.current = [];
      };
    }, [shipments, editable]);

    return <div ref={mapDivRef} className="h-full w-full" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
      {(railwayLoading || loading) && (
        <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
          <div className="w-3 height-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Төмөр замын өгөгдлийг уншиж байна...</span>
        </div>
      )}

      <Wrapper apiKey={googleMapsApiKey}>
        <GoogleMapInner />
      </Wrapper>
    </div>
  );
}
