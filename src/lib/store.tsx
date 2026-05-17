import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  initialShipments,
  pointOnRoute,
  fetchRoadRoute,
  nearestOnRoute,
  type LatLng,
  type Shipment,
  type ShipmentStatus,
  type CargoItem,
  type Dropoff,
} from "./demo-data";
import type { Json } from "@/integrations/supabase/types";

type Role = "admin" | "driver" | "customer";

interface StoreState {
  role: Role | null;
  name: string | null;
  loading: boolean;
  loginDemo: (role: Role) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  authMode: "supabase" | "mock";

  shipments: Shipment[];
  setStatus: (id: string, status: ShipmentStatus) => void;
  toggleSharing: (id: string) => void;
  sharingIds: Set<string>;

  setGpsOnline: (id: string, online: boolean) => void;
  startRealGps: (id: string) => void;
  stopRealGps: (id: string) => void;
  realGpsActive: Set<string>;

  addShipment: (s: Shipment) => void;
  updateShipment: (id: string, patch: Partial<Shipment>) => void;
  removeShipment: (id: string) => void;
  overridePosition: (id: string, pos: LatLng) => void;
  refreshRoadRoute: (id: string) => Promise<void>;
  markStopDone: (shipmentId: string, stopSeq: number) => void;
}

const Ctx = createContext<StoreState | null>(null);

const DEMO_PASSWORD = "demo1234";
const DEMO_EMAILS: Record<Role, string> = {
  admin: "admin@demo.mn",
  driver: "driver@demo.mn",
  customer: "customer@demo.mn",
};
const DEMO_NAMES: Record<Role, string> = {
  admin: "Админ Демо",
  driver: "Жолооч Демо",
  customer: "Харилцагч Демо",
};

function dbToShipment(
  row: Record<string, unknown>,
  stops: Record<string, unknown>[],
): Shipment {
  const route = (row.route as LatLng[]) ?? [];
  const roadRoute = (row.road_route as LatLng[] | null) ?? undefined;
  const position = (row.position as LatLng) ?? route[0] ?? [47.9184, 106.9177];
  const lastKnownPos = (row.last_known_pos as LatLng | null) ?? undefined;
  const cargoItems = (row.cargo_items as CargoItem[]) ?? [];
  const dropoffs: Dropoff[] = stops
    .filter((st) => (st.seq as number) > 0)
    .sort((a, b) => (a.seq as number) - (b.seq as number))
    .map((st) => ({
      location: st.location as string,
      position: st.position as LatLng,
      items: (st.items as CargoItem[]) ?? [],
      eta: (st.eta as string) ?? "",
      status: (st.status as "pending" | "done") ?? "pending",
      contact: (st.contact as string) ?? undefined,
    }));

  return {
    id: row.id as string,
    trackingId: row.tracking_id as string,
    cargo: row.cargo as string,
    origin: row.origin as string,
    destination: row.destination as string,
    driver: row.driver_name as string,
    vehicleId: (row.vehicle_id as string) ?? "",
    status: (row.status as ShipmentStatus) ?? "in_transit",
    route,
    roadRoute,
    progress: (row.progress as number) ?? 0,
    speed: (row.speed as number) ?? 0,
    eta: (row.eta as string) ?? "",
    position,
    type: (row.type as "truck" | "wagon") ?? "truck",
    country: (row.country as "MN" | "RU" | "CN") ?? "MN",
    gpsOnline: (row.gps_online as boolean) ?? true,
    lastGpsAt: (row.last_gps_at as string) ?? undefined,
    lastKnownPos,
    manualOverride: (row.manual_override as boolean) ?? false,
    driverPhone: (row.driver_phone as string) ?? "",
    driverLicense: (row.driver_license as string) ?? "",
    driverExperience: `${row.driver_experience ?? 0} жил`,
    driverRating: (row.driver_rating as number) ?? 0,
    plateNumber: (row.plate_number as string) ?? "",
    capacity: (row.capacity as string) ?? "",
    cargoItems,
    totalWeight: (row.total_weight as string) ?? "",
    shipper: (row.shipper as string) ?? "",
    consignee: (row.consignee as string) ?? "",
    dropoffs,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"supabase" | "mock">("supabase");
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [sharingIds, setSharingIds] = useState<Set<string>>(new Set());
  const [realGpsActive, setRealGpsActive] = useState<Set<string>>(new Set());
  const [dbReady, setDbReady] = useState(false);
  const tickRef = useRef<number | null>(null);
  const gpsWatchers = useRef<Map<string, number>>(new Map());

  const loadShipmentsFromDb = useCallback(async () => {
    try {
      const { data: rows, error: sErr } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: true });
      if (sErr || !rows?.length) throw sErr ?? new Error("no rows");

      const { data: stops, error: stErr } = await supabase
        .from("stops")
        .select("*")
        .order("seq", { ascending: true });
      if (stErr) throw stErr;

      const stopsByShipment = new Map<string, Record<string, unknown>[]>();
      for (const st of stops ?? []) {
        const sid = st.shipment_id as string;
        if (!stopsByShipment.has(sid)) stopsByShipment.set(sid, []);
        stopsByShipment.get(sid)!.push(st);
      }

      const mapped = rows.map((r) => dbToShipment(r, stopsByShipment.get(r.id as string) ?? []));
      setShipments(mapped);
      setDbReady(true);
    } catch {
      setDbReady(false);
    }
  }, []);

  const persistField = useCallback(async (id: string, patch: Record<string, unknown>) => {
    try {
      await supabase.from("shipments").update(patch).eq("id", id);
    } catch {
      // ignore
    }
  }, []);

  const persistShipment = useCallback(async (s: Shipment) => {
    try {
      const row = {
        tracking_id: s.trackingId,
        status: s.status,
        type: s.type ?? "truck",
        country: s.country ?? "MN",
        cargo: s.cargo,
        origin: s.origin,
        destination: s.destination,
        route: s.route as unknown as Json,
        road_route: s.roadRoute ? (s.roadRoute as unknown as Json) : null,
        progress: s.progress,
        position: s.position as unknown as Json,
        speed: s.speed,
        eta: s.eta,
        driver_name: s.driver,
        driver_phone: s.driverPhone,
        driver_license: s.driverLicense,
        driver_experience: parseInt(s.driverExperience) || 0,
        driver_rating: s.driverRating,
        vehicle_id: s.vehicleId,
        plate_number: s.plateNumber,
        capacity: s.capacity,
        total_weight: s.totalWeight,
        shipper: s.shipper,
        consignee: s.consignee,
        cargo_items: s.cargoItems as unknown as Json,
        gps_online: s.gpsOnline ?? true,
        last_gps_at: s.lastGpsAt ?? null,
        last_known_pos: s.lastKnownPos ? (s.lastKnownPos as unknown as Json) : null,
        manual_override: s.manualOverride ?? false,
      };

      if (s.id.includes("-") && s.id.length > 20) {
        await supabase.from("shipments").update(row).eq("id", s.id);
      } else {
        const { data } = await supabase.from("shipments").insert(row).select("id").single();
        if (data?.id) {
          setShipments((prev) => prev.map((x) => (x.id === s.id ? { ...x, id: data.id } : x)));
          const stops = s.dropoffs.map((d, i) => ({
            shipment_id: data.id,
            seq: i + 1,
            location: d.location,
            position: d.position as unknown as Json,
            items: d.items as unknown as Json,
            eta: d.eta,
            status: d.status,
            contact: d.contact ?? null,
          }));
          if (stops.length) await supabase.from("stops").insert(stops);
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  // ---------------- Real GPS via browser Geolocation API ----------------
  const startRealGps = useCallback((id: string) => {
    if (gpsWatchers.current.has(id)) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = pos.coords.speed; // m/s, can be null
        const gpsPos: LatLng = [lat, lng];

        setShipments((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            if (s.type === "wagon") return s; // wagons don't use GPS

            const path = s.roadRoute ?? s.route;
            const snap = nearestOnRoute(path, gpsPos);
            const kmh = speed != null ? Math.round(speed * 3.6) : s.speed;

            return {
              ...s,
              position: snap.pos,
              progress: snap.t,
              speed: kmh,
              gpsOnline: true,
              lastGpsAt: new Date().toISOString(),
              lastKnownPos: snap.pos,
              manualOverride: false,
            };
          }),
        );
      },
      (err) => {
        console.warn("[GPS] geolocation error:", err.message);
        // GPS failed — mark offline
        setShipments((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            return { ...s, gpsOnline: false, speed: 0 };
          }),
        );
        setRealGpsActive((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );

    gpsWatchers.current.set(id, watchId);
    setRealGpsActive((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...s, gpsOnline: true, lastGpsAt: new Date().toISOString() };
      }),
    );
  }, []);

  const stopRealGps = useCallback((id: string) => {
    const watchId = gpsWatchers.current.get(id);
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      gpsWatchers.current.delete(id);
    }
    setRealGpsActive((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Save last known position
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          gpsOnline: false,
          lastKnownPos: s.position,
          speed: 0,
        };
      }),
    );
  }, []);

  // Cleanup GPS watchers on unmount
  useEffect(() => {
    return () => {
      for (const [_, watchId] of gpsWatchers.current) {
        navigator.geolocation.clearWatch(watchId);
      }
      gpsWatchers.current.clear();
    };
  }, []);

  // ---------------- Auth bootstrap ----------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveRole = async (userId: string, email: string | null) => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (error) throw error;
        const r = (data?.[0]?.role as Role | undefined) ?? "customer";
        setRole(r);
        setAuthMode("supabase");
      } catch {
        const inferred = (Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0] ?? "customer") as Role;
        setRole(inferred);
        setAuthMode("mock");
      }
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();
        setName(profile?.display_name ?? email ?? "Хэрэглэгч");
      } catch {
        setName(email ? (DEMO_NAMES[Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0] as Role] ?? email) : "Хэрэглэгч");
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(() => resolveRole(session.user.id, session.user.email ?? null), 0);
      } else {
        setRole(null);
        setName(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        resolveRole(data.session.user.id, data.session.user.email ?? null).finally(() =>
          setLoading(false),
        );
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------------- Load from DB on auth ----------------
  useEffect(() => {
    if (!role || authMode !== "supabase") return;
    loadShipmentsFromDb();
  }, [role, authMode, loadShipmentsFromDb]);

  // ---------------- Road geometry (background) ----------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        shipments.map(async (s) => ({ id: s.id, road: await fetchRoadRoute(s.route) })),
      );
      if (cancelled) return;
      setShipments((prev) =>
        prev.map((s) => {
          const r = results.find((x) => x.id === s.id);
          if (!r?.road || r.road.length < 2) return s;
          return { ...s, roadRoute: r.road, position: pointOnRoute(r.road, s.progress) };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [dbReady]);

  // ---------------- Simulation loop ----------------
  // Only simulates shipments that do NOT have real GPS active.
  // Trucks with real GPS: position comes from Geolocation API.
  // Trucks with GPS offline: frozen at lastKnownPos.
  // Wagons: always time-based estimation.
  useEffect(() => {
    const tick = () => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.status !== "in_transit") return s;
          const path = s.roadRoute ?? s.route;
          const isWagon = s.type === "wagon";

          // Wagons: always time-based estimation (no GPS hardware)
          if (isWagon) {
            const jitter = 0.0035;
            const newProgress = Math.min(1, s.progress + jitter);
            const newPos = pointOnRoute(path, newProgress);
            const newSpeed = 45 + Math.round(Math.random() * 30);
            const status: ShipmentStatus = newProgress >= 1 ? "delivered" : "in_transit";
            return {
              ...s,
              progress: newProgress,
              position: newPos,
              speed: newSpeed,
              status,
              lastKnownPos: newPos,
              manualOverride: false,
            };
          }

          // Trucks with real GPS active: skip simulation (position from Geolocation)
          if (realGpsActive.has(s.id)) return s;

          // Trucks with GPS offline: freeze at lastKnownPos
          if (s.gpsOnline === false) {
            return s;
          }

          // Trucks with GPS online (simulation mode): advance normally
          const jitter = 0.002 + Math.random() * 0.004;
          const newProgress = Math.min(1, s.progress + jitter);
          const newPos = pointOnRoute(path, newProgress);
          const newSpeed = 55 + Math.round(Math.random() * 30);
          const status: ShipmentStatus = newProgress >= 1 ? "delivered" : "in_transit";
          return {
            ...s,
            progress: newProgress,
            position: newPos,
            speed: newSpeed,
            status,
            lastKnownPos: newPos,
            lastGpsAt: new Date().toISOString(),
            manualOverride: false,
          };
        }),
      );
    };
    tickRef.current = window.setInterval(tick, 3500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [realGpsActive]);

  // ---------------- Auth actions ----------------
  const loginDemo = async (r: Role) => {
    const email = DEMO_EMAILS[r];
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: DEMO_PASSWORD,
      });
      if (error) {
        setRole(r);
        setName(DEMO_NAMES[r]);
        setAuthMode("mock");
        return {};
      }
      setAuthMode("supabase");
      return {};
    } catch {
      setRole(r);
      setName(DEMO_NAMES[r]);
      setAuthMode("mock");
      return {};
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    // Stop all GPS watchers
    for (const [_, watchId] of gpsWatchers.current) {
      navigator.geolocation.clearWatch(watchId);
    }
    gpsWatchers.current.clear();
    setRealGpsActive(new Set());
    setRole(null);
    setName(null);
  };

  // ---------------- Shipment actions ----------------
  const setStatus = (id: string, status: ShipmentStatus) => {
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    persistField(id, { status });
  };

  const toggleSharing = (id: string) =>
    setSharingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setGpsOnline = (id: string, online: boolean) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (online) {
          const resumePos = s.lastKnownPos ?? s.position;
          const path = s.roadRoute ?? s.route;
          const snap = nearestOnRoute(path, resumePos);
          return {
            ...s,
            gpsOnline: true,
            lastGpsAt: new Date().toISOString(),
            position: snap.pos,
            lastKnownPos: snap.pos,
          };
        }
        return {
          ...s,
          gpsOnline: false,
          lastKnownPos: s.position,
          speed: 0,
        };
      }),
    );
    persistField(id, {
      gps_online: online,
      last_gps_at: online ? new Date().toISOString() : undefined,
    });
  };

  const addShipment = (s: Shipment) => {
    const seeded: Shipment = {
      ...s,
      gpsOnline: s.type !== "wagon",
      lastGpsAt: new Date().toISOString(),
      lastKnownPos: s.position,
    };
    setShipments((prev) => [seeded, ...prev]);
    persistShipment(seeded);
    fetchRoadRoute(s.route).then((road) => {
      if (!road || road.length < 2) return;
      setShipments((prev) =>
        prev.map((x) =>
          x.id === s.id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x,
        ),
      );
    });
  };

  const updateShipment = (id: string, patch: Partial<Shipment>) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const merged = { ...s, ...patch };
        if (patch.route && patch.route !== s.route) merged.roadRoute = undefined;
        return merged;
      }),
    );
    const current = shipments.find((x) => x.id === id);
    if (current) persistShipment({ ...current, ...patch });
    if (patch.route) {
      fetchRoadRoute(patch.route).then((road) => {
        if (!road || road.length < 2) return;
        setShipments((prev) =>
          prev.map((x) =>
            x.id === id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x,
          ),
        );
      });
    }
  };

  const removeShipment = (id: string) => {
    stopRealGps(id);
    setShipments((prev) => prev.filter((s) => s.id !== id));
    supabase.from("shipments").delete().eq("id", id).then(() => {});
  };

  const overridePosition = (id: string, pos: LatLng) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const path = s.roadRoute ?? s.route;
        const snap = nearestOnRoute(path, pos);
        return {
          ...s,
          position: snap.pos,
          progress: snap.t,
          lastKnownPos: snap.pos,
          lastGpsAt: new Date().toISOString(),
          manualOverride: true,
        };
      }),
    );
    const s = shipments.find((x) => x.id === id);
    if (s) {
      const path = s.roadRoute ?? s.route;
      const snap = nearestOnRoute(path, pos);
      persistField(id, {
        position: snap.pos as unknown as Json,
        progress: snap.t,
        last_known_pos: snap.pos as unknown as Json,
        last_gps_at: new Date().toISOString(),
        manual_override: true,
      });
    }
  };

  const refreshRoadRoute = async (id: string) => {
    const s = shipments.find((x) => x.id === id);
    if (!s) return;
    const road = await fetchRoadRoute(s.route);
    if (!road || road.length < 2) return;
    setShipments((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x,
      ),
    );
  };

  const markStopDone = (shipmentId: string, stopSeq: number) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        return {
          ...s,
          dropoffs: s.dropoffs.map((d, i) =>
            i === stopSeq - 1 ? { ...d, status: "done" as const } : d,
          ),
        };
      }),
    );
    supabase
      .from("stops")
      .update({ status: "done" })
      .eq("shipment_id", shipmentId)
      .eq("seq", stopSeq)
      .then(() => {});
  };

  return (
    <Ctx.Provider
      value={{
        role,
        name,
        loading,
        loginDemo,
        logout,
        authMode,
        shipments,
        setStatus,
        toggleSharing,
        sharingIds,
        setGpsOnline,
        startRealGps,
        stopRealGps,
        realGpsActive,
        addShipment,
        updateShipment,
        removeShipment,
        overridePosition,
        refreshRoadRoute,
        markStopDone,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
