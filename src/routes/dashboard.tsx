import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import type { Shipment } from "@/lib/demo-data";

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
  const { role, shipments } = useStore();
  const nav = useNavigate();
  const [focus, setFocus] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!role) nav({ to: "/" });
    else if (role === "driver") nav({ to: "/driver" });
    else if (role === "customer") nav({ to: "/track" });
  }, [role, nav]);

  if (role !== "admin") return null;

  const counts = shipments.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <AppShell>
      <div className="grid h-full grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* Sidebar */}
        <aside className="z-10 flex flex-col overflow-hidden border-r border-border bg-background/40 backdrop-blur">
          <div className="grid grid-cols-4 gap-2 border-b border-border p-4">
            {[
              { k: "Нийт", v: shipments.length, c: "text-foreground" },
              { k: "Замд", v: counts.in_transit || 0, c: "text-primary" },
              { k: "Зогссон", v: (counts.stopped || 0) + (counts.delayed || 0), c: "text-warning" },
              { k: "Хүргэсэн", v: counts.delivered || 0, c: "text-accent" },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-border bg-card/60 p-2 text-center">
                <div className={`text-xl font-semibold tabular-nums ${s.c}`}>{s.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.k}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-sm font-semibold">Идэвхтэй ачаанууд</h2>
            <button onClick={() => setFocus(undefined)} className="text-xs text-muted-foreground hover:text-foreground">
              Бүгд
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {shipments.map((s) => {
              const meta = statusMeta[s.status];
              const active = focus === s.id;
              return (
                <motion.button
                  layout
                  key={s.id}
                  onClick={() => setFocus(active ? undefined : s.id)}
                  className={`glass w-full rounded-xl p-3 text-left transition-all ${
                    active ? "ring-2 ring-primary/60 glow" : "hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">{s.trackingId}</div>
                      <div className="mt-0.5 text-sm font-medium">{s.cargo}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{s.origin}</span>
                    <span className="text-primary">→</span>
                    <span>{s.destination}</span>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full bg-primary"
                      animate={{ width: `${Math.round(s.progress * 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>{s.driver} · {s.vehicleId}</span>
                    <span>{s.speed} км/ц · ETA {s.eta}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* Map */}
        <div className="relative">
          <FleetMap shipments={shipments} focusId={focus} onSelect={setFocus} />
          <div className="glass pointer-events-none absolute left-4 top-4 rounded-xl px-3 py-2 text-xs text-muted-foreground">
            OpenStreetMap · Шууд GPS симуляц · Шинэчлэлт 3 секунд тутамд
          </div>
        </div>
      </div>
    </AppShell>
  );
}
