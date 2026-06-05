import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
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

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  experience: number;
  rating: number;
  plateNumber: string;
  vehicleId: string;
  capacity: string;
  type: "truck" | "wagon";
  company: string;
  country: "MN" | "RU" | "CN";
  active: boolean;
  trailerPlates: string[];
  passportImage?: string;
  profileImage?: string;
  accountNumber?: string;
  mongoliaPhone?: string;
  russiaPhone?: string;
  email?: string | null;
  userId?: string | null;
  vehicleCertImage?: string;
  trailerCertImage?: string;
}

export interface Station {
  id: string;
  name: string;
  city: string;
  position: LatLng;
  type: string;
  contact: string;
  active: boolean;
}

interface StoreState {
  role: Role | null;
  name: string | null;
  loading: boolean;
  loginDemo: (role: Role) => Promise<{ error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  authMode: "supabase" | "mock";
  userId: string | null;
  customerId: string | null;
  createUserAccount: (data: {
    email: string;
    password: string;
    role: "driver" | "customer";
    display_name: string;
    phone?: string;
  }) => Promise<{ user_id?: string; error?: string }>;

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
  overridePosition: (id: string, pos: LatLng, progress?: number) => void;
  updateUserAccount: (data: {
    userId: string;
    email?: string;
    password?: string;
    display_name?: string;
    phone?: string;
  }) => Promise<{ error?: string }>;
  refreshRoadRoute: (id: string) => Promise<void>;
  markStopDone: (shipmentId: string, stopSeq: number) => void;
  markStopPending: (shipmentId: string, stopSeq: number) => void;
  reloadShipments: () => Promise<void>;

  drivers: Driver[];
  addDriver: (d: Driver) => Promise<string | undefined>;
  updateDriver: (id: string, patch: Partial<Driver>) => void;
  removeDriver: (id: string) => void;

  stations: Station[];
  addStation: (s: Station) => void;
  addStationLocal: (s: Station) => void;
  updateStation: (id: string, patch: Partial<Station>) => void;
  removeStation: (id: string) => void;
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

function dbToShipment(row: Record<string, unknown>, stops: Record<string, unknown>[]): Shipment {
  const type = (row.type as "truck" | "wagon") ?? "truck";
  const route = (row.route as LatLng[]) ?? [];
  const roadRoute =
    type === "wagon" ? undefined : ((row.road_route as LatLng[] | null) ?? undefined);
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
    createdAt: (row.created_at as string) ?? undefined,
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
    shipperId: (row.shipper_id as string) ?? undefined,
    receiverId: (row.receiver_id as string) ?? undefined,
    dropoffs,
  };
}

function parseLatLng(lat: unknown, lng: unknown, fallback: LatLng = [47.9184, 106.9177]): LatLng {
  const nlat = Number(lat);
  const nlng = Number(lng);
  if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return fallback;
  return [nlat, nlng];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"supabase" | "mock">("supabase");
  const [userId, setUserId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]); // Start with empty array, load from DB
  const [sharingIds, setSharingIds] = useState<Set<string>>(new Set());
  const [realGpsActive, setRealGpsActive] = useState<Set<string>>(new Set());
  const [dbReady, setDbReady] = useState(false);
  const tickRef = useRef<number | null>(null);
  const gpsWatchers = useRef<Map<string, number>>(new Map());
  const gpsLastPersist = useRef<Map<string, number>>(new Map());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stations, setStations] = useState<Station[]>([]);

  const loadShipmentsFromDb = useCallback(async () => {
    try {
      const baseQuery = supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: true });
      if (role === "customer" && !customerId) {
        setShipments([]);
        setDbReady(false);
        return;
      }

      const shipmentQuery =
        role === "customer" && customerId
          ? baseQuery.or(`shipper_id.eq.${customerId},receiver_id.eq.${customerId}`)
          : baseQuery;

      const { data: rows, error: sErr } = await shipmentQuery;
      if (sErr) throw sErr;

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

      const mapped = (rows ?? []).map((r) =>
        dbToShipment(r, stopsByShipment.get(r.id as string) ?? []),
      );
      setShipments(mapped);
      setDbReady(true);
    } catch {
      setDbReady(false);
    }
  }, [role, authMode, customerId, userId]);

  const loadDriversFromDb = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("drivers").select("*").order("name");
      if (error || !data) throw error;
      setDrivers(
        (data as any[]).map((r) => ({
          id: r.id as string,
          name: r.name as string,
          phone: r.phone as string,
          license: r.license as string,
          experience: (r.experience as number) ?? 0,
          rating: (r.rating as number) ?? 4.5,
          plateNumber: r.plate_number as string,
          vehicleId: r.vehicle_id as string,
          profileImage:
            (r.profile_photo_url as string | null | undefined) ??
            (r.profile_image as string | null | undefined) ??
            "",
          passportImage:
            (r.passport_photo_url as string | null | undefined) ??
            (r.passport_image as string | null | undefined) ??
            "",
          company: (r.company as string | null | undefined) ?? "",
          capacity: r.capacity as string,
          type: (r.type as "truck" | "wagon") ?? "truck",
          country: (r.country as "MN" | "RU" | "CN") ?? "MN",
          active: (r.active as boolean) ?? true,
          trailerPlates:
            (r.trailer_plates as string | null | undefined)
              ?.split(",")
              .map((plate) => plate.trim())
              .filter(Boolean) ?? [],
          vehicleCertImage: (r.vehicle_cert_url as string | null | undefined) ?? "",
          trailerCertImage: (r.trailer_cert_url as string | null | undefined) ?? "",
          email: (r.email as string | null) ?? null,
          userId: (r.user_id as string | null) ?? null,
        })),
      );
    } catch {
      // ignore
    }
  }, []);

  const loadCustomerForUser = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      setCustomerId(data?.id ?? null);
    } catch {
      setCustomerId(null);
    }
  }, []);

  const loadStationsFromDb = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("stations").select("*").order("name");
      if (error || !data) throw error;
      setStations(
        data.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          city: "",
          position: parseLatLng(r.latitude, r.longitude),
          type: "station",
          contact: "",
          active: true,
        })),
      );
    } catch {
      // ignore
    }
  }, []);

  const reportCrudError = useCallback((operation: string, error: unknown) => {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "Сэрвэрийн алдаа гарлаа");
    console.error(`CRUD ${operation} failed:`, error);
    window.alert(`⚠️ ${operation} алдаатай боллоо.

${message}`);
  }, []);

  const persistField = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        const { error } = await supabase
          .from("shipments")
          .update(patch as never)
          .eq("id", id);
        if (error) throw error;
      } catch (err) {
        reportCrudError("shipment update", err);
      }
    },
    [reportCrudError],
  );

  const persistShipment = useCallback(
    async (s: Shipment) => {
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
          shipper_id: s.shipperId ?? null,
          receiver_id: s.receiverId ?? null,
          cargo_items: s.cargoItems as unknown as Json,
          gps_online: s.gpsOnline ?? true,
          last_gps_at: s.lastGpsAt ?? null,
          last_known_pos: s.lastKnownPos ? (s.lastKnownPos as unknown as Json) : null,
          manual_override: s.manualOverride ?? false,
        };

        if (s.id.includes("-") && s.id.length > 20) {
          const { error } = await supabase.from("shipments").update(row).eq("id", s.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("shipments")
            .insert(row)
            .select("id")
            .single();
          if (error) throw error;
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
            if (stops.length) {
              const { error: stopsError } = await supabase.from("stops").insert(stops);
              if (stopsError) throw stopsError;
            }
          }
        }
      } catch (err) {
        reportCrudError("shipment save", err);
      }
    },
    [reportCrudError],
  );

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

            const kmh = speed != null ? Math.round(speed * 3.6) : s.speed;

            // Special handling for "empty" status: driver en route to pickup point
            if (s.status === "empty") {
              const pickupPoint = s.route[0]; // origin station
              if (pickupPoint) {
                const pickupRoute: LatLng[] = [gpsPos, pickupPoint];
                const updated = {
                  ...s,
                  position: gpsPos,
                  progress: 0, // main route progress stays 0 until loaded
                  speed: kmh,
                  gpsOnline: true,
                  lastGpsAt: new Date().toISOString(),
                  lastKnownPos: gpsPos,
                  manualOverride: false,
                  pickupRoute,
                };

                try {
                  const last = gpsLastPersist.current.get(id) ?? 0;
                  const now = Date.now();
                  if (now - last > 5000) {
                    gpsLastPersist.current.set(id, now);
                    persistField(id, {
                      position: gpsPos as unknown as Json,
                      speed: kmh,
                      last_gps_at: new Date().toISOString(),
                      last_known_pos: gpsPos as unknown as Json,
                    });
                  }
                } catch {}

                return updated;
              }
            }

            // "Loading" status: keep position at origin (pickup point), progress stays 0
            if (s.status === "loading") {
              const pickupPoint = s.route[0]; // origin station
              const loadingPos = pickupPoint ?? gpsPos;
              const updated = {
                ...s,
                position: loadingPos,
                progress: 0, // still loading, no progress on main route
                speed: 0,
                gpsOnline: true,
                lastGpsAt: new Date().toISOString(),
                lastKnownPos: loadingPos,
                manualOverride: false,
              };

              try {
                const last = gpsLastPersist.current.get(id) ?? 0;
                const now = Date.now();
                if (now - last > 5000) {
                  gpsLastPersist.current.set(id, now);
                  persistField(id, {
                    position: loadingPos as unknown as Json,
                    speed: 0,
                    last_gps_at: new Date().toISOString(),
                    last_known_pos: loadingPos as unknown as Json,
                  });
                }
              } catch {}

              return updated;
            }

            const path = s.roadRoute ?? s.route;
            const snap = nearestOnRoute(path, gpsPos);

            const updated = {
              ...s,
              position: snap.pos,
              progress: snap.t,
              speed: kmh,
              gpsOnline: true,
              lastGpsAt: new Date().toISOString(),
              lastKnownPos: snap.pos,
              manualOverride: false,
            };

            // Throttled persistence: only push to server roughly every 5s
            try {
              const last = gpsLastPersist.current.get(id) ?? 0;
              const now = Date.now();
              if (now - last > 5000) {
                gpsLastPersist.current.set(id, now);
                persistField(id, {
                  position: snap.pos as unknown as Json,
                  progress: snap.t,
                  speed: kmh,
                  last_gps_at: new Date().toISOString(),
                  last_known_pos: snap.pos as unknown as Json,
                });
              }
            } catch {
              // ignore persistence errors
            }

            return updated;
          }),
        );
      },
      () => {
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
    // initialize last-persist timestamp so first update persists quickly
    gpsLastPersist.current.set(id, Date.now() - 6000);
  }, []);

  const stopRealGps = useCallback((id: string) => {
    const watchId = gpsWatchers.current.get(id);
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      gpsWatchers.current.delete(id);
    }
    gpsLastPersist.current.delete(id);
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
          // Keep pickupRoute so driver can see their last known path if still empty
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
      setUserId(userId);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (error) throw error;
        const r = (data?.[0]?.role as Role | undefined) ?? "customer";
        setRole(r);
        setAuthMode("supabase");
        if (r === "customer") {
          await loadCustomerForUser(userId);
        } else {
          setCustomerId(null);
        }
      } catch {
        const inferred = (Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0] ??
          "customer") as Role;
        setRole(inferred);
        setAuthMode("mock");
        setCustomerId(null);
      }
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();
        setName(profile?.display_name ?? email ?? "Хэрэглэгч");
      } catch {
        setName(
          email
            ? (DEMO_NAMES[Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0] as Role] ??
                email)
            : "Хэрэглэгч",
        );
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
        setUserId(null);
        setCustomerId(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------------- Load from DB on auth ----------------
  useEffect(() => {
    if (!role) return;
    if (role === "customer" && authMode === "supabase" && userId && customerId === null) return;
    loadShipmentsFromDb();
    loadDriversFromDb();
    loadStationsFromDb();
  }, [
    role,
    authMode,
    userId,
    customerId,
    loadShipmentsFromDb,
    loadDriversFromDb,
    loadStationsFromDb,
  ]);
  // ---------------- Road geometry (background) ----------------
  // Only fetch road geometry for trucks (via OSRM).
  // Wagons rely solely on the local GeoJSON (`/railway_routes.geojson`)
  // which is loaded and interpolated in the FleetMap component.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        shipments.map(async (s) => {
          // Skip wagons — they use the local GeoJSON instead
          if (s.type === "wagon") return { id: s.id, road: null };
          return {
            id: s.id,
            road: await fetchRoadRoute(s.route),
          };
        }),
      );
      if (cancelled) return;
      setShipments((prev) =>
        prev.map((s) => {
          const r = results.find((x) => x.id === s.id);
          // For wagons: never set roadRoute — FleetMap uses GeoJSON
          if (s.type === "wagon") return s;
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
  // Disabled: no automatic demo movement. Map positions update only from real driver GPS
  // or manual override, not from generated demo simulation.
  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

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
        setUserId(null);
        setCustomerId(null);
        return {};
      }
      setAuthMode("supabase");
      return {};
    } catch {
      setRole(r);
      setName(DEMO_NAMES[r]);
      setAuthMode("mock");
      setUserId(null);
      setCustomerId(null);
      return {};
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      setAuthMode("supabase");
      return {};
    } catch {
      return { error: "Нэвтрэхэд алдаа гарлаа" };
    }
  };

  const createUserAccount = async (data: {
    email: string;
    password: string;
    role: "driver" | "customer";
    display_name: string;
    phone?: string;
  }) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return { error: "Нэвтрээгүй байна" };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) return { error: result.error || "Хэрэглэгч үүсгэхэд алдаа гарлаа" };
      return { user_id: result.user_id };
    } catch {
      return { error: "Сервертэй холбогдоход алдаа гарлаа" };
    }
  };

  const updateUserAccount = async (data: {
    userId: string;
    email?: string;
    password?: string;
    display_name?: string;
    phone?: string;
  }) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return { error: "Нэвтрээгүй байна" };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/update-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) return { error: result.error || "Хэрэглэгчийг шинэчилж чадсангүй" };
      return {};
    } catch {
      return { error: "Сервертэй холбогдоход алдаа гарлаа" };
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
    setUserId(null);
    setCustomerId(null);
  };

  // ---------------- Shipment actions ----------------
  // Helper: check if a driver already has an active (non-delivered) shipment.
  // Returns the conflicting shipment if found.
  const driverHasActiveShipment = useCallback(
    (driverName: string, excludeId?: string): Shipment | undefined => {
      if (!driverName) return undefined;
      return shipments.find(
        (s) => s.driver === driverName && s.status !== "delivered" && s.id !== excludeId,
      );
    },
    [shipments],
  );

  const setStatus = (id: string, status: ShipmentStatus) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        // When transitioning FROM "empty": clear pickupRoute, snap to origin point, reset progress
        if (s.status === "empty" && status !== "empty") {
          const originPos = s.route[0];
          return {
            ...s,
            status,
            pickupRoute: undefined,
            position: originPos ?? s.position,
            progress: 0,
          };
        }
        // When transitioning FROM "loading" to "in_transit": reset progress to 0 (green bar starts fresh)
        if (s.status === "loading" && status === "in_transit") {
          return {
            ...s,
            status,
            progress: 0,
            position: s.route[0] ?? s.position,
          };
        }
        return { ...s, status };
      }),
    );
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
          const path = s.type === "wagon" ? s.route : (s.roadRoute ?? s.route);
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
    // Prevent assigning a driver who already has an active (non-delivered) shipment
    if (s.driver && s.type !== "wagon") {
      const conflict = driverHasActiveShipment(s.driver);
      if (conflict) {
        alert(
          `⚠️ "${s.driver}" жолооч "${conflict.trackingId}" хүргэлтэнд бүртгэлтэй байна!\n\nНэг жолооч нэг удаад зөвхөн 1 хүргэлтэнд бүртгэгдэх боломжтой.`,
        );
        return;
      }
    }

    const seeded: Shipment = {
      ...s,
      gpsOnline: s.type !== "wagon",
      lastGpsAt: new Date().toISOString(),
      lastKnownPos: s.position,
    };
    setShipments((prev) => [seeded, ...prev]);
    persistShipment(seeded);
    if (seeded.type !== "wagon") {
      fetchRoadRoute(s.route).then((road) => {
        if (!road || road.length < 2) return;
        setShipments((prev) =>
          prev.map((x) =>
            x.id === s.id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x,
          ),
        );
      });
    }
  };

  const updateShipment = (id: string, patch: Partial<Shipment>) => {
    // If changing driver, check for conflict
    if (patch.driver && patch.type !== "wagon") {
      const conflict = driverHasActiveShipment(patch.driver, id);
      if (conflict) {
        alert(
          `⚠️ "${patch.driver}" жолооч "${conflict.trackingId}" хүргэлтэнд бүртгэлтэй байна!\n\nНэг жолооч нэг удаад зөвхөн 1 хүргэлтэнд бүртгэгдэх боломжтой.`,
        );
        return;
      }
    }

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
    if (patch.route && current && current.type !== "wagon") {
      const fetchRoute = async () => {
        const road = await fetchRoadRoute(patch.route!);
        if (!road || road.length < 2) return;
        setShipments((prev) =>
          prev.map((x) =>
            x.id === id ? { ...x, roadRoute: road, position: pointOnRoute(road, x.progress) } : x,
          ),
        );
      };
      fetchRoute();
    }
  };

  const removeShipment = (id: string) => {
    stopRealGps(id);
    setShipments((prev) => prev.filter((s) => s.id !== id));
    supabase
      .from("shipments")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportCrudError("shipment delete", error);
      });
  };

  const overridePosition = (id: string, pos: LatLng, progressOverride?: number) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (s.type === "wagon" && progressOverride !== undefined) {
          // Wagon: position already snapped to GeoJSON railway by FleetMap,
          // use the progress calculated along the GeoJSON-interpolated route.
          // Do NOT snap to straight-line s.route — that would undo the GeoJSON snap.
          return {
            ...s,
            position: pos,
            progress: progressOverride,
            lastKnownPos: pos,
            lastGpsAt: new Date().toISOString(),
            manualOverride: true,
          };
        }
        const path = s.type === "wagon" ? s.route : (s.roadRoute ?? s.route);
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
      if (s.type === "wagon" && progressOverride !== undefined) {
        persistField(id, {
          position: pos as unknown as Json,
          progress: progressOverride,
          last_known_pos: pos as unknown as Json,
          last_gps_at: new Date().toISOString(),
          manual_override: true,
        });
      } else {
        const path = s.type === "wagon" ? s.route : (s.roadRoute ?? s.route);
        const snap = nearestOnRoute(path, pos);
        persistField(id, {
          position: snap.pos as unknown as Json,
          progress: snap.t,
          last_known_pos: snap.pos as unknown as Json,
          last_gps_at: new Date().toISOString(),
          manual_override: true,
        });
      }
    }
  };

  const refreshRoadRoute = async (id: string) => {
    const s = shipments.find((x) => x.id === id);
    if (!s) return;
    // Skip wagons — they use the local GeoJSON for routing
    if (s.type === "wagon") return;
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
        const nextDropoffs = s.dropoffs.map((d, i) =>
          i === stopSeq - 1 ? { ...d, status: "done" as const } : d,
        );
        const allDone = nextDropoffs.every((d) => d.status === "done");
        return {
          ...s,
          dropoffs: nextDropoffs,
          status: allDone ? "delivered" : s.status,
        };
      }),
    );
    supabase
      .from("stops")
      .update({ status: "done" })
      .eq("shipment_id", shipmentId)
      .eq("seq", stopSeq)
      .then(({ error }) => {
        if (error) reportCrudError("stop update", error);
      });

    const shipment = shipments.find((x) => x.id === shipmentId);
    if (shipment) {
      const nextDropoffs = shipment.dropoffs.map((d, i) =>
        i === stopSeq - 1 ? { ...d, status: "done" as const } : d,
      );
      const allDone = nextDropoffs.every((d) => d.status === "done");
      if (allDone) {
        persistField(shipmentId, { status: "delivered" });
      }
    }
  };

  const markStopPending = (shipmentId: string, stopSeq: number) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const nextDropoffs = s.dropoffs.map((d, i) =>
          i === stopSeq - 1 ? { ...d, status: "pending" as const } : d,
        );
        const allDone = nextDropoffs.every((d) => d.status === "done");
        return {
          ...s,
          dropoffs: nextDropoffs,
          status: allDone ? s.status : s.status === "delivered" ? "in_transit" : s.status,
        };
      }),
    );
    supabase
      .from("stops")
      .update({ status: "pending" })
      .eq("shipment_id", shipmentId)
      .eq("seq", stopSeq)
      .then(({ error }) => {
        if (error) reportCrudError("stop update", error);
      });

    const shipment = shipments.find((x) => x.id === shipmentId);
    if (shipment) {
      const nextDropoffs = shipment.dropoffs.map((d, i) =>
        i === stopSeq - 1 ? { ...d, status: "pending" as const } : d,
      );
      const allDone = nextDropoffs.every((d) => d.status === "done");
      if (!allDone && shipment.status === "delivered") {
        persistField(shipmentId, { status: "in_transit" });
      }
    }
  };

  // ---------------- Driver CRUD ----------------
  const addDriver = async (d: Driver) => {
    setDrivers((prev) => [...prev, d]);
    const { data, error } = await supabase
      .from("drivers")
      .insert({
        name: d.name,
        phone: d.phone,
        license: d.license,
        experience: d.experience,
        rating: d.rating,
        plate_number: d.plateNumber,
        vehicle_id: d.vehicleId,
        capacity: d.capacity,
        type: d.type,
        country: d.country,
        active: d.active,
        trailer_plates: d.trailerPlates.join(", ") || null,
        profile_photo_url: d.profileImage || null,
        passport_photo_url: d.passportImage || null,
        vehicle_cert_url: d.vehicleCertImage || null,
        trailer_cert_url: d.trailerCertImage || null,
        company: d.company || null,
        email: d.email || null,
        user_id: d.userId || null,
      } as any)
      .select("id")
      .single();
    if (error) {
      reportCrudError("driver create", error);
      return undefined;
    }
    if (data?.id) {
      setDrivers((prev) => prev.map((x) => (x.id === d.id ? { ...x, id: data.id } : x)));
      return data.id as string;
    }
    return undefined;
  };

  const updateDriver = (id: string, patch: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.license !== undefined) row.license = patch.license;
    if (patch.experience !== undefined) row.experience = patch.experience;
    if (patch.rating !== undefined) row.rating = patch.rating;
    if (patch.plateNumber !== undefined) row.plate_number = patch.plateNumber;
    if (patch.vehicleId !== undefined) row.vehicle_id = patch.vehicleId;
    if (patch.capacity !== undefined) row.capacity = patch.capacity;
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.company !== undefined) row.company = patch.company;
    if (patch.country !== undefined) row.country = patch.country;
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.trailerPlates !== undefined)
      row.trailer_plates = patch.trailerPlates.join(", ") || null;
    if (patch.profileImage !== undefined) row.profile_photo_url = patch.profileImage;
    if (patch.passportImage !== undefined) row.passport_photo_url = patch.passportImage;
    if (patch.vehicleCertImage !== undefined) row.vehicle_cert_url = patch.vehicleCertImage;
    if (patch.trailerCertImage !== undefined) row.trailer_cert_url = patch.trailerCertImage;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.userId !== undefined) row.user_id = patch.userId;
    supabase
      .from("drivers")
      .update(row as never)
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportCrudError("driver update", error);
      });
  };

  const removeDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    supabase
      .from("drivers")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportCrudError("driver delete", error);
      });
  };

  // ---------------- Station CRUD ----------------
  const addStation = (s: Station) => {
    setStations((prev) => [...prev, s]);
    supabase
      .from("stations")
      .insert({
        name: s.name,
        latitude: s.position[0],
        longitude: s.position[1],
      })
      .select("id")
      .single()
      .then(({ data, error }) => {
        if (error) {
          reportCrudError("station create", error);
          return;
        }
        if (data?.id)
          setStations((prev) => prev.map((x) => (x.id === s.id ? { ...x, id: data.id } : x)));
      });
  };

  // Only update local state, no DB insert (used when station already inserted in DB)
  const addStationLocal = (s: Station) => {
    setStations((prev) => {
      // Avoid duplicates
      if (prev.find((x) => x.id === s.id)) return prev;
      return [...prev, s];
    });
  };

  const updateStation = (id: string, patch: Partial<Station>) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.position !== undefined) {
      row.latitude = patch.position[0];
      row.longitude = patch.position[1];
    }
    supabase
      .from("stations")
      .update(row as never)
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportCrudError("station update", error);
      });
  };

  const removeStation = (id: string) => {
    setStations((prev) => prev.filter((s) => s.id !== id));
    supabase
      .from("stations")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportCrudError("station delete", error);
      });
  };

  return (
    <Ctx.Provider
      value={{
        role,
        name,
        loading,
        loginDemo,
        loginWithEmail,
        logout,
        authMode,
        createUserAccount,
        updateUserAccount,
        userId,
        customerId,
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
        reloadShipments: loadShipmentsFromDb,
        markStopDone,
        markStopPending,
        drivers,
        addDriver,
        updateDriver,
        removeDriver,
        stations,
        addStation,
        addStationLocal,
        updateStation,
        removeStation,
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
