import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import type { Shipment } from "@/lib/demo-data";
import { ShipmentDetailModal } from "@/components/ShipmentDetailModal";
import { ShipmentFormModal } from "@/components/ShipmentFormModal";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

const statusMeta: Record<Shipment["status"], { label: string; cls: string }> = {
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
  } = useStore();
  const nav = useNavigate();
  const [focus, setFocus] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("list");
  const detail = shipments.find((s) => s.id === detailId) ?? null;

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
    else if (role === "driver") nav({ to: "/driver" });
    else if (role === "customer") nav({ to: "/track" });
  }, [role, loading, nav]);

  if (loading || role !== "admin") return null;

  const counts = shipments.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <AppShell mobileView={mobileView} onMobileViewChange={setMobileView}>
      <div className="grid h-full grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* Sidebar / List */}
        <aside
          className={`z-10 flex flex-col overflow-hidden border-r border-border bg-background/40 backdrop-blur ${
            mobileView === "list" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="grid grid-cols-4 gap-2 border-b border-border p-3 md:p-4">
            {[
              { k: "Нийт", v: shipments.length, c: "text-foreground" },
              { k: "Замд", v: counts.in_transit || 0, c: "text-primary" },
              { k: "Зогссон", v: (counts.stopped || 0) + (counts.delayed || 0), c: "text-warning" },
              { k: "Хүргэсэн", v: counts.delivered || 0, c: "text-accent" },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-border bg-card/60 p-2 text-center">
                <div className={`text-lg font-semibold tabular-nums md:text-xl ${s.c}`}>{s.v}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground md:text-[10px]">
                  {s.k}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 pt-3 md:px-4 md:pt-4">
            <h2 className="text-sm font-semibold">Идэвхтэй ачаанууд</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFocus(undefined)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Бүгд
              </button>
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

          <div className="flex-1 space-y-2 overflow-y-auto p-3 md:p-4">
            {shipments.map((s) => {
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
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{s.trackingId}</div>
                      <div className="mt-0.5 truncate text-sm font-medium">{s.cargo}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
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
                    <span className="truncate">{s.origin}</span>
                    <span className="shrink-0 text-primary">→</span>
                    <span className="truncate">{s.destination}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full bg-primary"
                      animate={{ width: `${Math.round(s.progress * 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                    <span className="truncate">{s.driver}</span>
                    <span className="shrink-0 tabular-nums">{s.speed} км/ц · ETA {s.eta}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* Map */}
        <div className={`relative ${mobileView === "map" ? "block" : "hidden lg:block"}`}>
          <FleetMap
            shipments={shipments}
            focusId={focus}
            onSelect={(id) => {
              setFocus(id);
              setDetailId(id);
            }}
            editable
            onDragEnd={(id, pos) => overridePosition(id, pos)}
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
          <div className="glass pointer-events-none absolute left-4 top-4 hidden rounded-xl px-3 py-2 text-xs text-muted-foreground lg:block">
            GPS шууд · Вагон = цагаар · Маркер чирж байршил шинэчилнэ
          </div>
        </div>
      </div>
    </AppShell>
  );
}
