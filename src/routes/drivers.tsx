import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, type Driver } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/drivers")({
  component: DriversPage,
});

function emptyDriver(): Driver {
  return {
    id: `d_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    phone: "",
    license: "B/C",
    experience: 1,
    rating: 4.5,
    plateNumber: "",
    vehicleId: "",
    capacity: "20 тн",
    type: "truck",
    country: "MN",
    active: true,
  };
}

const PAGE_SIZE = 10;

function DriversPage() {
  const { role, loading, drivers, addDriver, updateDriver, removeDriver } = useStore();
  const nav = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Driver>(emptyDriver());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < drivers.length) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, drivers.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, drivers.length]);

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
    else if (role !== "admin") nav({ to: "/driver" });
  }, [role, loading, nav]);

  if (loading || role !== "admin") return null;

  const visibleDrivers = drivers.slice(0, visibleCount);
  const hasMore = visibleCount < drivers.length;

  const openNew = () => {
    setEditing(null);
    setForm(emptyDriver());
    setFormOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({ ...d });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateDriver(editing.id, form);
    } else {
      addDriver(form);
    }
    setFormOpen(false);
  };

  const typeLabel = (t: string) => (t === "wagon" ? "🚆 Вагон" : "🚚 Машин");
  const countryFlag = (c: string) => (c === "RU" ? "🇷🇺" : c === "CN" ? "🇨🇳" : "🇲🇳");

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-6 pb-24">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Жолооч нар</h1>
              <p className="mt-1 text-sm text-muted-foreground">Жолооч, бригадын мэдээлэл удирдлага</p>
            </div>
            <button
              onClick={openNew}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + Шинэ жолооч
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {visibleDrivers.map((d) => (
              <motion.div
                key={d.id}
                layout
                className="glass rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{d.name}</span>
                      <span className="text-sm">{countryFlag(d.country)}</span>
                      <span className="text-xs text-muted-foreground">{typeLabel(d.type)}</span>
                      {!d.active && (
                        <span className="rounded-full border border-warning/40 bg-warning/15 px-1.5 py-0.5 text-[9px] text-warning">
                          Идэвхгүй
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                      <span>Утас: {d.phone}</span>
                      <span>Үнэмлэх: {d.license}</span>
                      <span>Дугаар: {d.plateNumber}</span>
                      <span>Туршлага: {d.experience} жил</span>
                      <span>Даац: {d.capacity}</span>
                      <span>Үнэлгээ: ⭐ {d.rating.toFixed(1)}</span>
                      <span>Машин: {d.vehicleId}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(d)}
                      className="rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs text-primary hover:bg-primary/25"
                    >
                      ✎ Засах
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`${d.name}-г устгах уу?`)) removeDriver(d.id);
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
                  onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, drivers.length))}
                  className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Илүүг ачааллах ({drivers.length - visibleCount} үлдсэн)
                </button>
              </div>
            )}

            {!hasMore && drivers.length > PAGE_SIZE && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Бүх жолооч харагдсан ({drivers.length})
              </div>
            )}

            {drivers.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Жолооч бүртгэгдээгүй байна. "Шинэ жолооч" товчийг дарж нэмнэ үү.
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
                  {editing ? "Жолооч засах" : "Шинэ жолооч"}
                </div>
                <h3 className="mt-1 text-lg font-semibold">{form.name || "Шинэ жолооч"}</h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Нэр">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Утас">
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Үнэмлэх">
                    <input value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Туршлага (жил)">
                    <input type="number" min={0} value={form.experience} onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })} className="inp" />
                  </Field>
                  <Field label="Үнэлгээ (0-5)">
                    <input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="inp" />
                  </Field>
                  <Field label="Улсын дугаар">
                    <input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Машин ID">
                    <input value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Даац">
                    <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Тээврийн төрөл">
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "truck" | "wagon" })} className="inp">
                      <option value="truck">🚚 Машин</option>
                      <option value="wagon">🚆 Вагон</option>
                    </select>
                  </Field>
                  <Field label="Улс">
                    <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value as "MN" | "RU" | "CN" })} className="inp">
                      <option value="MN">🇲🇳 Монгол</option>
                      <option value="RU">🇷🇺 ОХУ</option>
                      <option value="CN">🇨🇳 БНХАУ</option>
                    </select>
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
