import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore, type Driver } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";

import type { Shipment } from "@/lib/demo-data";
import { ShipmentDetailModal } from "@/components/ShipmentDetailModal";
import { ShipmentFormModal } from "@/components/ShipmentFormModal";
import { MobileViewToggle } from "@/components/MobileViewToggle";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

const statusMeta: Record<Shipment["status"], { label: string; cls: string }> = {
  empty: { label: "Хоосон (авах)", cls: "bg-warning/15 text-warning border-warning/30" },
  loading: { label: "Ачиж байна", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  in_transit: { label: "Замд", cls: "bg-primary/15 text-primary border-primary/30" },
  stopped: { label: "Зогссон", cls: "bg-warning/15 text-warning border-warning/30" },
  delayed: { label: "Хоцрол", cls: "bg-destructive/15 text-destructive border-destructive/40" },
  delivered: { label: "Хүргэгдсэн", cls: "bg-accent/15 text-accent border-accent/30" },
};

function DashboardPage() {
  const {
    role,
    loading,
    shipments,
    addShipment,
    updateShipment,
    removeShipment,
    overridePosition,
    markStopDone,
    reloadShipments,
  } = useStore();
  const nav = useNavigate();
  const [focus, setFocus] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [mode, setMode] = useState<"all" | "truck" | "railway">("all");
  const detail = shipments.find((s) => s.id === detailId) ?? null;
  const [showDelivered, setShowDelivered] = useState(false);

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterTrackingId, setFilterTrackingId] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Customer[]) || [];
    },
  });

  const { drivers } = useStore();

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
    else if (role === "driver") nav({ to: "/driver" });
    else if (role === "customer") nav({ to: "/track" });
  }, [role, loading, nav]);

  if (loading || role !== "admin") return null;

  // Compute filtered shipments
  const baseVisible = showDelivered ? shipments : shipments.filter((x) => x.status !== "delivered");
  const modeFiltered =
    mode === "all"
      ? baseVisible
      : baseVisible.filter((x) => (mode === "truck" ? x.type === "truck" : x.type === "wagon"));
  const filtered = modeFiltered.filter((s) => {
    // Date from filter
    if (filterDateFrom && s.createdAt) {
      const sDate = new Date(s.createdAt);
      const fromDate = new Date(filterDateFrom);
      if (sDate < fromDate) return false;
    }
    // Date to filter
    if (filterDateTo && s.createdAt) {
      const sDate = new Date(s.createdAt);
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (sDate > toDate) return false;
    }
    // Customer filter (search in shipper/consignee)
    if (filterCustomer) {
      const matchCustomer = customers.find((c) => c.id === filterCustomer);
      if (matchCustomer) {
        const cName = matchCustomer.name.toLowerCase();
        if (
          !s.shipper?.toLowerCase().includes(cName) &&
          !s.consignee?.toLowerCase().includes(cName)
        ) {
          return false;
        }
      }
    }
    // Driver filter
    if (filterDriver) {
      const matchDriver = drivers.find((d) => d.id === filterDriver);
      if (matchDriver && s.driver !== matchDriver.name) {
        return false;
      }
    }
    // Tracking number filter
    if (filterTrackingId) {
      if (!s.trackingId.toLowerCase().includes(filterTrackingId.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const counts = shipments.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <AppShell>
      <MobileViewToggle value={mobileView} onChange={setMobileView} />

      <div className="grid h-full grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* Sidebar / List */}
        <aside
          className={
            mobileView === "list"
              ? "fixed inset-0 z-50 flex flex-col overflow-hidden border-r border-border bg-background/90 backdrop-blur lg:static lg:flex lg:inset-auto"
              : "z-10 hidden lg:flex flex-col overflow-hidden border-r border-border bg-background/40 backdrop-blur"
          }
        >
          <div className="grid grid-cols-5 gap-2 border-b border-border p-4">
            {[
              { k: "Нийт", v: shipments.length, c: "text-foreground" },
              { k: "Хоосон", v: (counts.empty || 0) + (counts.loading || 0), c: "text-warning" },
              { k: "Замд", v: counts.in_transit || 0, c: "text-primary" },
              { k: "Зогссон", v: (counts.stopped || 0) + (counts.delayed || 0), c: "text-warning" },
              { k: "Хүргэсэн", v: counts.delivered || 0, c: "text-accent" },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-border bg-card/60 p-2 text-center">
                <div className={`text-xl font-semibold tabular-nums ${s.c}`}>{s.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.k}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Идэвхтэй ачаанууд</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFocus(undefined)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Бүгд
              </button>
              {!showDelivered ? (
                <button
                  onClick={async () => {
                    try {
                      await reloadShipments();
                    } catch {
                      // ignore
                    }
                    setShowDelivered(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Хүргэгдсэн
                </button>
              ) : (
                <button
                  onClick={() => setShowDelivered(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Хүргэгдсэн нуух
                </button>
              )}
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                + Шинэ
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 px-4 pb-2 pt-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                mode === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Бүгд
            </button>
            <button
              type="button"
              onClick={() => setMode("truck")}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                mode === "truck"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Машинууд
            </button>
            <button
              type="button"
              onClick={() => setMode("railway")}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                mode === "railway"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Төмөр замын
            </button>
          </div>

          {/* Filter section */}
          <div className="border-t border-border px-4 py-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Шүүлтүүр
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  Эхлэх өдөр
                </div>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  Дуусах өдөр
                </div>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  Харилцагч
                </div>
                <select
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                  className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  <option value="">Бүгд</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  Жолооч
                </div>
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                  className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  <option value="">Бүгд</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                Хүргэлтийн дугаар
              </div>
              <input
                type="text"
                value={filterTrackingId}
                onChange={(e) => setFilterTrackingId(e.target.value)}
                placeholder="MN-..."
                className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
              />
            </div>
            {(filterDateFrom ||
              filterDateTo ||
              filterCustomer ||
              filterDriver ||
              filterTrackingId) && (
              <button
                onClick={() => {
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterCustomer("");
                  setFilterDriver("");
                  setFilterTrackingId("");
                }}
                className="mt-2 w-full rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive hover:bg-destructive/20"
              >
                ✕ Шүүлтүүр арилгах
              </button>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-24 lg:pb-4">
            {filtered.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Шүүлтүүрт тохирох хүргэлт олдсонгүй
              </div>
            )}
            {filtered.map((s) => {
              const meta = statusMeta[s.status];
              const active = focus === s.id;
              const gpsOff = s.type !== "wagon" && s.gpsOnline === false;
              return (
                <motion.button
                  layout
                  key={s.id}
                  onClick={() => {
                    setFocus(s.id);
                    setDetailId(s.id);
                    setMobileView("map");
                  }}
                  className={`glass w-full rounded-xl p-3 text-left transition-all ${
                    active ? "ring-2 ring-primary/60 glow" : "hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">{s.trackingId}</div>
                      <div className="mt-0.5 text-sm font-medium">{s.cargo}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {s.type === "wagon" && (
                        <span className="rounded-full border border-warning/40 bg-warning/15 px-1.5 py-0.5 text-[9px] text-warning">
                          EST
                        </span>
                      )}
                      {gpsOff && (
                        <span className="rounded-full border border-destructive/40 bg-destructive/15 px-1.5 py-0.5 text-[9px] text-destructive">
                          GPS OFF
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{s.origin}</span>
                    <span className="text-primary">→</span>
                    <span>{s.destination}</span>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className={`h-full ${
                        s.status === "empty"
                          ? "bg-warning"
                          : s.status === "loading"
                            ? "bg-blue-500"
                            : s.status === "in_transit"
                              ? "bg-primary"
                              : s.status === "delivered"
                                ? "bg-accent"
                                : "bg-primary"
                      }`}
                      animate={{ width: `${Math.round(s.progress * 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>
                      {s.driver} · {s.vehicleId}
                    </span>
                    <span>
                      {s.speed} км/ц · ETA {s.eta}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* Map */}
        <div className={`relative ${mobileView === "map" ? "block" : "hidden lg:block"}`}>
          <FleetMap
            shipments={filtered}
            focusId={focus}
            onSelect={(id) => {
              setFocus(id);
              setDetailId(id);
            }}
            editable
            onDragEnd={(id, pos, progress) => overridePosition(id, pos, progress)}
          />
          <ShipmentDetailModal
            shipment={detail}
            onClose={() => setDetailId(null)}
            isAdmin
            onEdit={(id) => {
              const s = shipments.find((x) => x.id === id) ?? null;
              setEditing(s);
              setDetailId(null);
              setFormOpen(true);
            }}
            onDelete={(id) => removeShipment(id)}
            onMarkStopDone={markStopDone}
            onMarkStopPending={markStopPending}
          />
          <ShipmentFormModal
            open={formOpen}
            initial={editing}
            onClose={() => setFormOpen(false)}
            onSave={(s) => {
              if (editing) updateShipment(editing.id, s);
              else addShipment(s);
            }}
          />
          <div className="glass pointer-events-none absolute left-4 top-14 hidden rounded-xl px-3 py-2 text-xs text-muted-foreground lg:top-4 lg:block">
            🛰 Шууд GPS · 🚆 Вагон = цагаар тооцоологдоно · Админ маркерыг чирж байршил шинэчилнэ
          </div>
          {/* Legend for marker glow: status colors */}
          <div className="glass pointer-events-none absolute right-4 top-14 hidden rounded-xl px-3 py-2 text-xs text-muted-foreground lg:top-4 lg:block">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ boxShadow: "0 0 8px rgba(245,158,11,.9)", background: "#f59e0b" }}
              />
              <span>Хоосон (авах)</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ boxShadow: "0 0 8px rgba(59,130,246,.9)", background: "#3b82f6" }}
              />
              <span>Ачиж байна</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ boxShadow: "0 0 8px rgba(16,185,129,.9)", background: "#10b981" }}
              />
              <span>Live GPS</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ boxShadow: "0 0 8px rgba(239,68,68,.9)", background: "#ef4444" }}
              />
              <span>Offline</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
