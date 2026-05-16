import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialShipments, pointOnRoute, fetchRoadRoute, type LatLng, type Shipment, type ShipmentStatus } from "./demo-data";

type Role = "admin" | "driver" | "customer";

interface AuthState {
  role: Role | null;
  name: string | null;
  login: (role: Role) => void;
  logout: () => void;
}

interface StoreState extends AuthState {
  shipments: Shipment[];
  setStatus: (id: string, status: ShipmentStatus) => void;
  toggleSharing: (id: string) => void;
  sharingIds: Set<string>;
  // Admin actions
  addShipment: (s: Shipment) => void;
  updateShipment: (id: string, patch: Partial<Shipment>) => void;
  removeShipment: (id: string) => void;
  overridePosition: (id: string, pos: LatLng) => void;
  refreshRoadRoute: (id: string) => Promise<void>;
}

const Ctx = createContext<StoreState | null>(null);

const ROLE_NAMES: Record<Role, string> = {
  admin: "Админ — Диспетчер",
  driver: "Жолооч — Б. Батбаяр",
  customer: "Харилцагч — Demo Co.",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem("demo_role") as Role) || null;
  });
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [sharingIds, setSharingIds] = useState<Set<string>>(new Set(["s1"]));
  const tickRef = useRef<number | null>(null);

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

  useEffect(() => {
    const tick = () => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.status !== "in_transit") return s;
          const path = s.roadRoute ?? s.route;
          const jitter = 0.002 + Math.random() * 0.004;
          const newProgress = Math.min(1, s.progress + jitter);
          const newPos = pointOnRoute(path, newProgress);
          const newSpeed = 55 + Math.round(Math.random() * 35);
          const status: ShipmentStatus = newProgress >= 1 ? "delivered" : "in_transit";
          return { ...s, progress: newProgress, position: newPos, speed: newSpeed, status };
        }),
      );
    };
    tickRef.current = window.setInterval(tick, 3500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const login = (r: Role) => {
    localStorage.setItem("demo_role", r);
    setRole(r);
  };
  const logout = () => {
    localStorage.removeItem("demo_role");
    setRole(null);
  };

  const setStatus = (id: string, status: ShipmentStatus) =>
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  const toggleSharing = (id: string) =>
    setSharingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addShipment = (s: Shipment) => {
    setShipments((prev) => [s, ...prev]);
    // Try to enrich with real road geometry in background
    fetchRoadRoute(s.route).then((road) => {
      if (!road || road.length < 2) return;
      setShipments((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x)),
      );
    });
  };

  const updateShipment = (id: string, patch: Partial<Shipment>) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const merged = { ...s, ...patch };
        // If route changed, drop cached road geometry so it can be refetched
        if (patch.route && patch.route !== s.route) merged.roadRoute = undefined;
        return merged;
      }),
    );
    if (patch.route) {
      fetchRoadRoute(patch.route).then((road) => {
        if (!road || road.length < 2) return;
        setShipments((prev) =>
          prev.map((x) => (x.id === id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x)),
        );
      });
    }
  };

  const removeShipment = (id: string) =>
    setShipments((prev) => prev.filter((s) => s.id !== id));

  const overridePosition = (id: string, pos: LatLng) =>
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, position: pos, speed: 0 } : s)));

  const refreshRoadRoute = async (id: string) => {
    const s = shipments.find((x) => x.id === id);
    if (!s) return;
    const road = await fetchRoadRoute(s.route);
    if (!road || road.length < 2) return;
    setShipments((prev) =>
      prev.map((x) => (x.id === id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x)),
    );
  };

  return (
    <Ctx.Provider
      value={{
        role,
        name: role ? ROLE_NAMES[role] : null,
        login,
        logout,
        shipments,
        setStatus,
        toggleSharing,
        sharingIds,
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
