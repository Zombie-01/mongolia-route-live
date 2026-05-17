import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  initialShipments,
  pointOnRoute,
  fetchRoadRoute,
  type LatLng,
  type Shipment,
  type ShipmentStatus,
} from "./demo-data";

type Role = "admin" | "driver" | "customer";

interface StoreState {
  role: Role | null;
  name: string | null;
  loading: boolean;
  loginDemo: (role: Role) => Promise<{ error?: string }>;
  logout: () => Promise<void>;

  shipments: Shipment[];
  setStatus: (id: string, status: ShipmentStatus) => void;
  toggleSharing: (id: string) => void;
  sharingIds: Set<string>;

  // GPS
  setGpsOnline: (id: string, online: boolean) => void;

  // Admin
  addShipment: (s: Shipment) => void;
  updateShipment: (id: string, patch: Partial<Shipment>) => void;
  removeShipment: (id: string) => void;
  overridePosition: (id: string, pos: LatLng) => void;
  refreshRoadRoute: (id: string) => Promise<void>;
}

const Ctx = createContext<StoreState | null>(null);

const DEMO_PASSWORD = "demo1234";
const DEMO_EMAILS: Record<Role, string> = {
  admin: "admin@demo.mn",
  driver: "driver@demo.mn",
  customer: "customer@demo.mn",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [sharingIds, setSharingIds] = useState<Set<string>>(new Set(["s1"]));
  const tickRef = useRef<number | null>(null);

  // ---------------- Auth bootstrap (real Supabase) ----------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveRole = async (userId: string, email: string | null) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const r = (data?.[0]?.role as Role | undefined) ?? "customer";
      setRole(r);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      setName(profile?.display_name ?? email ?? "Хэрэглэгч");
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

  // ---------------- Road geometry (background) ----------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        initialShipments.map(async (s) => ({ id: s.id, road: await fetchRoadRoute(s.route) })),
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
  }, []);

  // ---------------- Simulation loop ----------------
  useEffect(() => {
    const tick = () => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.status !== "in_transit") return s;
          const path = s.roadRoute ?? s.route;
          // Wagons: always time-based (no GPS). Trucks with manual override: time-based too.
          // Trucks with GPS offline: freeze position (keep progress paused).
          const isWagon = s.type === "wagon";
          const timeBased = isWagon || s.manualOverride;
          if (!isWagon && s.gpsOnline === false) {
            // GPS offline → keep last position, don't advance progress
            return s;
          }
          const jitter = timeBased ? 0.0035 : 0.002 + Math.random() * 0.004;
          const newProgress = Math.min(1, s.progress + jitter);
          const newPos = pointOnRoute(path, newProgress);
          const baseSpeed = isWagon ? 45 : 55;
          const newSpeed = baseSpeed + Math.round(Math.random() * 30);
          const status: ShipmentStatus = newProgress >= 1 ? "delivered" : "in_transit";
          return {
            ...s,
            progress: newProgress,
            position: newPos,
            speed: newSpeed,
            status,
            lastKnownPos: newPos,
            lastGpsAt: !isWagon && s.gpsOnline ? new Date().toISOString() : s.lastGpsAt,
            manualOverride: false, // resets after one tick of motion
          };
        }),
      );
    };
    tickRef.current = window.setInterval(tick, 3500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  // ---------------- Auth actions ----------------
  const loginDemo = async (r: Role) => {
    const email = DEMO_EMAILS[r];
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setName(null);
  };

  // ---------------- Shipment actions ----------------
  const setStatus = (id: string, status: ShipmentStatus) =>
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  const toggleSharing = (id: string) =>
    setSharingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setGpsOnline = (id: string, online: boolean) =>
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (online) {
          // Resume from last known position; mark fresh GPS
          return {
            ...s,
            gpsOnline: true,
            lastGpsAt: new Date().toISOString(),
            position: s.lastKnownPos ?? s.position,
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

  const addShipment = (s: Shipment) => {
    const seeded: Shipment = {
      ...s,
      gpsOnline: s.type !== "wagon",
      lastGpsAt: new Date().toISOString(),
      lastKnownPos: s.position,
    };
    setShipments((prev) => [seeded, ...prev]);
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

  const removeShipment = (id: string) => setShipments((prev) => prev.filter((s) => s.id !== id));

  const overridePosition = (id: string, pos: LatLng) =>
    setShipments((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              position: pos,
              lastKnownPos: pos,
              lastGpsAt: new Date().toISOString(),
              manualOverride: true,
            }
          : s,
      ),
    );

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

  return (
    <Ctx.Provider
      value={{
        role,
        name,
        loading,
        loginDemo,
        logout,
        shipments,
        setStatus,
        toggleSharing,
        sharingIds,
        setGpsOnline,
        addShipment,
        updateShipment,
        removeShipment,
        overridePosition,
        refreshRoadRoute,
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
