import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialShipments, pointOnRoute, type Shipment, type ShipmentStatus } from "./demo-data";

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

  // Simulation loop — every 3s advance each in_transit shipment
  useEffect(() => {
    const tick = () => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.status !== "in_transit") return s;
          // speed variance + occasional pause
          const jitter = 0.002 + Math.random() * 0.004;
          const newProgress = Math.min(1, s.progress + jitter);
          const newPos = pointOnRoute(s.route, newProgress);
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
