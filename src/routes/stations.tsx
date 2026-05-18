import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, type Station } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { CITIES } from "@/lib/cities";
import type { LatLng } from "@/lib/demo-data";

export const Route = createFileRoute("/stations")({
  component: StationsPage,
});

function emptyStation(): Station {
  return {
    id: `st_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    city: "",
    position: [47.9184, 106.9177],
    type: "warehouse",
    contact: "",
    active: true,
  };
}

const typeLabels: Record<string, string> = {
  warehouse: "Агуулах",
  terminal: "Терминал",
  checkpoint: "Шалган нэвтрэх",
  customs: "Гааль",
};

const typeColors: Record<string, string> = {
  warehouse: "border-primary/30 bg-primary/15 text-primary",
  terminal: "border-accent/30 bg-accent/15 text-accent",
  checkpoint: "border-warning/30 bg-warning/15 text-warning",
  customs: "border-destructive/30 bg-destructive/15 text-destructive",
};

const PAGE_SIZE = 10;

function StationsPage() {
  const { role, loading, stations, addStation, updateStation, removeStation } = useStore();
  const nav = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form, setForm] = useState<Station>(emptyStation());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
    else if (role !== "admin") nav({ to: "/driver" });
  }, [role, loading, nav]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < stations.length) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, stations.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, stations.length]);

  if (loading || role !== "admin") return null;

  const visibleStations = stations.slice(0, visibleCount);
  const hasMore = visibleCount < stations.length;

  const openNew = () => {
    setEditing(null);
    setForm(emptyStation());
    setFormOpen(true);
  };

  const openEdit = (s: Station) => {
    setEditing(s);
    setForm({ ...s });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateStation(editing.id, form);
    } else {
      addStation(form);
    }
    setFormOpen(false);
  };

  const handleCitySelect = (cityName: string) => {
    const city = CITIES.find((c) => c.name === cityName);
    setForm((f) => ({
      ...f,
      city: cityName,
      position: city?.position ?? f.position,
    }));
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-6 pb-24">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Өртөө, буулгах цэгүүд</h1>
              <p className="mt-1 text-sm text-muted-foreground">Дундын зогсоол, агуулах, терминал, гаалийн цэгүүд</p>
            </div>
            <button
              onClick={openNew}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + Шинэ өртөө
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {visibleStations.map((s) => (
              <motion.div
                key={s.id}
                layout
                className="glass rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{s.name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${typeColors[s.type] ?? typeColors.warehouse}`}>
                        {typeLabels[s.type] ?? s.type}
                      </span>
                      {!s.active && (
                        <span className="rounded-full border border-warning/40 bg-warning/15 px-1.5 py-0.5 text-[9px] text-warning">
                          Идэвхгүй
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      <span>Хот: {s.city}</span>
                      <span className="ml-4 font-mono">{s.position[0].toFixed(4)}, {s.position[1].toFixed(4)}</span>
                      {s.contact && <span className="ml-4">Холбогдох: {s.contact}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs text-primary hover:bg-primary/25"
                    >
                      ✎ Засах
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`${s.name}-г устгах уу?`)) removeStation(s.id);
                      }}
                      className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} />

            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, stations.length))}
                  className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Илүүг ачааллах ({stations.length - visibleCount} үлдсэн)
                </button>
              </div>
            )}

            {!hasMore && stations.length > PAGE_SIZE && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Бүх өртөө харагдсан ({stations.length})
              </div>
            )}

            {stations.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Өртөө бүртгэгдээгүй байна. "Шинэ өртөө" товчийг дарж нэмнэ үү.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFormOpen(false)}
            style={{ zIndex: 10000 }}
            className="fixed inset-0 grid place-items-center bg-background/70 p-4 backdrop-blur"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="glass flex w-full max-w-lg flex-col overflow-hidden rounded-2xl"
            >
              <div className="border-b border-border p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {editing ? "Өртөө засах" : "Шинэ өртөө"}
                </div>
                <h3 className="mt-1 text-lg font-semibold">{form.name || "Шинэ өртөө"}</h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Нэр">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" placeholder="Дархан — Төв агуулах" />
                  </Field>
                  <Field label="Хот">
                    <select value={form.city} onChange={(e) => handleCitySelect(e.target.value)} className="inp">
                      <option value="">-- Сонгох --</option>
                      {CITIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Төрөл">
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="inp">
                      <option value="warehouse">Агуулах</option>
                      <option value="terminal">Терминал</option>
                      <option value="checkpoint">Шалган нэвтрэх</option>
                      <option value="customs">Гааль</option>
                    </select>
                  </Field>
                  <Field label="Холбогдох">
                    <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="inp" placeholder="Утас, нэр" />
                  </Field>
                  <Field label="Урт (lat)">
                    <input
                      type="number"
                      step={0.0001}
                      value={form.position[0]}
                      onChange={(e) => setForm({ ...form, position: [Number(e.target.value), form.position[1]] })}
                      className="inp tabular-nums"
                    />
                  </Field>
                  <Field label="Өргөн (lng)">
                    <input
                      type="number"
                      step={0.0001}
                      value={form.position[1]}
                      onChange={(e) => setForm({ ...form, position: [form.position[0], Number(e.target.value)] })}
                      className="inp tabular-nums"
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded"
                  />
                  Идэвхтэй
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border p-4">
                <button onClick={() => setFormOpen(false)} className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm">
                  Болих
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  {editing ? "Хадгалах" : "Нэмэх"}
                </button>
              </div>

              <style>{`
                .inp { width: 100%; background: var(--card); color: var(--foreground); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13px; outline: none; }
                .inp:focus { border-color: var(--primary); box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 30%, transparent); }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
