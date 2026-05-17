import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import type { ShipmentStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/driver")({
  component: DriverPage,
});

function DriverPage() {
  const { role, loading, shipments, setStatus, sharingIds, toggleSharing, setGpsOnline } = useStore();
  const nav = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
  }, [role, loading, nav]);

  if (loading || !role) return null;

  const myShipments = shipments.slice(0, 2);
  const current = shipments.find((s) => s.id === active) ?? myShipments[0];
  if (!current) return null;
  const sharing = sharingIds.has(current.id);
  const gpsOnline = current.gpsOnline !== false && current.type !== "wagon";

  const statusBtns: { v: ShipmentStatus; label: string }[] = [
    { v: "in_transit", label: "Замд" },
    { v: "stopped", label: "Зогссон" },
    { v: "delivered", label: "Хүргэгдсэн" },
  ];

  return (
    <AppShell>
      {/* Mobile toggle */}
      <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full border border-border bg-card/80 p-0.5 text-xs backdrop-blur lg:hidden">
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={`rounded-full px-3 py-1 transition-colors ${
              mobileView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {v === "map" ? "🗺 Газрын зураг" : "📋 Жагсаалт"}
          </button>
        ))}
      </div>

      <div className="grid h-full grid-cols-1 lg:grid-cols-[400px_1fr]">
        <aside
          className={`z-10 flex flex-col gap-4 overflow-y-auto border-r border-border bg-background/40 p-4 backdrop-blur ${
            mobileView === "list" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Идэвхтэй ачаа</div>
                <div className="mt-1 text-lg font-semibold">{current.trackingId}</div>
              </div>
              <button
                onClick={() => {
                  toggleSharing(current.id);
                  if (current.type !== "wagon") setGpsOnline(current.id, !gpsOnline);
                }}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  sharing && gpsOnline ? "bg-primary" : "bg-secondary"
                }`}
                aria-label="GPS sharing"
              >
                <motion.span
                  layout
                  className="absolute top-0.5 h-6 w-6 rounded-full bg-background shadow"
                  animate={{ left: sharing && gpsOnline ? 22 : 2 }}
                />
              </button>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              GPS дамжуулалт{" "}
              <span className={gpsOnline ? "text-primary" : "text-warning"}>
                {current.type === "wagon"
                  ? "вагон — цагаар тооцоолно"
                  : gpsOnline
                    ? "идэвхтэй"
                    : "тасарсан (сүүлийн байршил хадгалагдсан)"}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <Row label="Ачаа" value={current.cargo} />
              <Row label="Замнал" value={`${current.origin} → ${current.destination}`} />
              <Row label="Машин" value={current.vehicleId} />
              <Row label="Хурд" value={`${current.speed} км/ц`} />
              <Row label="ETA" value={current.eta} />
            </div>

            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Төлөв</div>
              <div className="grid grid-cols-3 gap-2">
                {statusBtns.map((b) => {
                  const on = current.status === b.v;
                  return (
                    <button
                      key={b.v}
                      onClick={() => setStatus(current.id, b.v)}
                      className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                        on
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setStatus(current.id, "in_transit")}
                className="rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                ▶ Аялал эхлүүлэх
              </button>
              <button
                onClick={() => setStatus(current.id, "stopped")}
                className="rounded-lg border border-border bg-card/60 py-2.5 text-sm hover:bg-secondary"
              >
                ■ Зогсоох
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 px-1 text-xs uppercase tracking-wider text-muted-foreground">Миний ачаанууд</div>
            <div className="space-y-2">
              {myShipments.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActive(s.id); setMobileView("map"); }}
                  className={`glass w-full rounded-xl p-3 text-left text-sm transition-colors ${
                    current.id === s.id ? "ring-1 ring-primary/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.trackingId}</span>
                    <span className="text-xs text-muted-foreground">{s.destination}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className={`relative ${mobileView === "map" ? "block" : "hidden lg:block"}`}>
          <FleetMap shipments={[current]} focusId={current.id} />
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
