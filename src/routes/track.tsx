import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import { MobileViewToggle } from "@/components/MobileViewToggle";

export const Route = createFileRoute("/track")({
  component: TrackPage,
});

function TrackPage() {
  const { role, shipments } = useStore();
  const nav = useNavigate();
  const [query, setQuery] = useState("MN-2041");
  const [submitted, setSubmitted] = useState("MN-2041");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  useEffect(() => {
    if (!role) nav({ to: "/" });
  }, [role, nav]);

  const found = shipments.find((s) => s.trackingId.toLowerCase() === submitted.toLowerCase());

  return (
    <AppShell>
      <MobileViewToggle value={mobileView} onChange={setMobileView} />

      <div className="grid h-full grid-cols-1 lg:grid-cols-[420px_1fr]">
        <aside
          className={`z-10 flex flex-col gap-4 overflow-y-auto border-r border-border bg-background/40 p-5 backdrop-blur ${
            mobileView === "list" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div>
            <h1 className="text-xl font-semibold">Ачаа хайх</h1>
            <p className="mt-1 text-sm text-muted-foreground">Хяналтын дугаараа оруулж шууд хянана уу.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query.trim());
              setMobileView("map");
            }}
            className="glass flex items-center gap-2 rounded-xl p-2"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="MN-2041"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Хайх
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {shipments.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setQuery(s.trackingId);
                  setSubmitted(s.trackingId);
                  setMobileView("map");
                }}
                className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {s.trackingId}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {found ? (
              <motion.div
                key={found.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{found.trackingId}</div>
                    <div className="mt-1 text-lg font-semibold">{found.cargo}</div>
                  </div>
                  <div className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-[11px] text-primary">
                    {found.status === "delivered" ? "Хүргэгдсэн" : found.status === "stopped" ? "Зогссон" : found.status === "delayed" ? "Хоцрол" : "Замд"}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{found.origin}</span>
                    <span>{found.destination}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      animate={{ width: `${Math.round(found.progress * 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <div className="mt-2 text-right text-xs text-muted-foreground tabular-nums">
                    {Math.round(found.progress * 100)}% · ETA {found.eta}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Жолооч" value={found.driver} />
                  <Stat label="Машин" value={found.vehicleId} />
                  <Stat label="Хурд" value={`${found.speed} км/ц`} />
                  <Stat label="Төлөв" value={found.status === "in_transit" ? "Хөдөлгөөнтэй" : "Зогссон"} />
                </div>

                {/* Dropoffs for customer */}
                {found.dropoffs.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Буулгах цэгүүд</div>
                    <div className="space-y-2">
                      {found.dropoffs.map((d, i) => (
                        <div key={i} className="rounded-lg border border-border bg-card/40 p-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">#{i + 1} {d.location}</span>
                            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${
                              d.status === "done"
                                ? "border-accent/30 bg-accent/15 text-accent"
                                : "border-primary/30 bg-primary/15 text-primary"
                            }`}>
                              {d.status === "done" ? "Буулгасан" : "Хүлээгдэж буй"}
                            </span>
                          </div>
                          <div className="mt-1 text-muted-foreground">ETA {d.eta}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="nf"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-xl p-5 text-center text-sm text-muted-foreground"
              >
                Хяналтын дугаар олдсонгүй.
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        <div className={`relative ${mobileView === "map" ? "block" : "hidden lg:block"}`}>
          <FleetMap shipments={found ? [found] : shipments} focusId={found?.id} />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
