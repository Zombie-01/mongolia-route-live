import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import { MobileViewToggle } from "@/components/MobileViewToggle";
import type { ShipmentStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/driver")({
  component: DriverPage,
});

function DriverPage() {
  const {
    role, loading, shipments, setStatus,
    sharingIds, toggleSharing, setGpsOnline,
    startRealGps, stopRealGps, realGpsActive,
  } = useStore();
  const nav = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
  }, [role, loading, nav]);

  if (loading || !role) return null;

  const myShipments = shipments.slice(0, 2);
  const current = shipments.find((s) => s.id === active) ?? myShipments[0];
  if (!current) return null;
  const sharing = sharingIds.has(current.id);
  const isWagon = current.type === "wagon";
  const gpsLive = realGpsActive.has(current.id);
  const gpsOnline = current.gpsOnline !== false && !isWagon;

  const statusBtns: { v: ShipmentStatus; label: string }[] = [
    { v: "in_transit", label: "Замд" },
    { v: "stopped", label: "Зогссон" },
    { v: "delivered", label: "Хүргэгдсэн" },
  ];

  const handleGpsToggle = () => {
    if (isWagon) return;
    toggleSharing(current.id);
    if (gpsLive || gpsOnline) {
      // Turning OFF
      stopRealGps(current.id);
      setGpsOnline(current.id, false);
      setGpsError(null);
    } else {
      // Turning ON — try real GPS first
      if (!navigator.geolocation) {
        setGpsError("Таны төхөөрөмж GPS дэмжихгүй байна");
        setGpsOnline(current.id, true);
        return;
      }
      setGpsError(null);
      startRealGps(current.id);
      setGpsOnline(current.id, true);
    }
  };

  return (
    <AppShell>
      <MobileViewToggle value={mobileView} onChange={setMobileView} />

      <div className="grid h-full grid-cols-1 lg:grid-cols-[400px_1fr]">
        <aside
          className={`z-10 flex flex-col gap-4 overflow-y-auto border-r border-border bg-background/40 p-4 pb-24 backdrop-blur lg:pb-4 ${
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
                onClick={handleGpsToggle}
                disabled={isWagon}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  (gpsLive || gpsOnline) && !isWagon ? "bg-primary" : "bg-secondary"
                } ${isWagon ? "cursor-not-allowed opacity-50" : ""}`}
                aria-label="GPS sharing"
              >
                <motion.span
                  layout
                  className="absolute top-0.5 h-6 w-6 rounded-full bg-background shadow"
                  animate={{ left: (gpsLive || gpsOnline) && !isWagon ? 22 : 2 }}
                />
              </button>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              GPS дамжуулалт{" "}
              {isWagon ? (
                <span className="text-warning">вагон — цагаар тооцоолно</span>
              ) : gpsLive ? (
                <span className="text-primary font-medium">бодит GPS идэвхтэй</span>
              ) : gpsOnline ? (
                <span className="text-primary">идэвхтэй (симуляци)</span>
              ) : (
                <span className="text-warning">тасарсан (сүүлийн байршил хадгалагдсан)</span>
              )}
            </div>

            {gpsLive && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span className="text-primary font-medium">Бодит GPS цааш байршил авч байна</span>
              </div>
            )}

            {gpsError && (
              <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                {gpsError}
              </div>
            )}

            <div className="mt-5 space-y-2 text-sm">
              <Row label="Ачаа" value={current.cargo} />
              <Row label="Замнал" value={`${current.origin} → ${current.destination}`} />
              {isWagon ? (
                <>
                  <Row label="Бригад" value={current.vehicleId} />
                  <Row label="Холбогдох" value={current.driverPhone} />
                </>
              ) : (
                <>
                  <Row label="Жолооч" value={current.driver} />
                  <Row label="Машин" value={current.vehicleId} />
                </>
              )}
              <Row label="Хурд" value={`${current.speed} км/ц`} />
              <Row label="ETA" value={current.eta} />
              <Row label="Байршил" value={`${current.position[0].toFixed(4)}, ${current.position[1].toFixed(4)}`} />
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
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}
