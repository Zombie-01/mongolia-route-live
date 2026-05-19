import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, type Driver } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
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
    trailerPlates: [],
  };
}

const PAGE_SIZE = 10;

function DriversPage() {
  const { role, loading, drivers, addDriver, updateDriver, removeDriver, createUserAccount } = useStore();
  const nav = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Driver>(emptyDriver());
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
    setAccountEmail("");
    setAccountPassword("");
    setAccountError(null);
    setAccountCreated(false);
    setFormOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({ ...d });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateDriver(editing.id, form);
      setFormOpen(false);
      return;
    }

    // New driver — create auth account first
    if (!accountEmail.trim() || !accountPassword.trim()) {
      setAccountError("И-мэйл болон нууц үг оруулна уу");
      return;
    }
    if (accountPassword.length < 6) {
      setAccountError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }

    setCreatingAccount(true);
    setAccountError(null);

    const result = await createUserAccount({
      email: accountEmail,
      password: accountPassword,
      role: "driver",
      display_name: form.name,
      phone: form.phone,
    });

    if (result.error) {
      setCreatingAccount(false);
      setAccountError(result.error);
      return;
    }

    // Auth account created — now save driver record with user_id
    const driverWithUser = { ...form };
    addDriver(driverWithUser);

    // Also update the driver row with user_id and email in the DB
    if (result.user_id) {
      await supabase
        .from("drivers")
        .update({ user_id: result.user_id, email: accountEmail })
        .eq("name", form.name)
        .eq("phone", form.phone);
    }

    setCreatingAccount(false);
    setAccountCreated(true);
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
                      {d.trailerPlates.length > 0 && (
                        <span className="col-span-2">Чиргүүл: {d.trailerPlates.join(", ")}</span>
                      )}
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
                {/* Auth account section — only for new drivers */}
                {!editing && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      Нэвтрэх бүртгэл үүсгэх
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      Жолооч системд нэвтрэхийн тулд и-мэйл болон нууц үг оруулна уу. Энэ бүртгэлээр жолооч өөрийн самбарт нэвтэрнэ.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="И-мэйл">
                        <input
                          type="email"
                          value={accountEmail}
                          onChange={(e) => { setAccountEmail(e.target.value); setAccountError(null); }}
                          className="inp"
                          placeholder="driver@company.mn"
                        />
                      </Field>
                      <Field label="Нууц үг">
                        <input
                          type="password"
                          value={accountPassword}
                          onChange={(e) => { setAccountPassword(e.target.value); setAccountError(null); }}
                          className="inp"
                          placeholder="Хамгийн багадаа 6 тэмдэгт"
                        />
                      </Field>
                    </div>
                    {accountError && (
                      <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {accountError}
                      </div>
                    )}
                  </div>
                )}

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
                  <Field label="Улс">
                    <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value as "MN" | "RU" | "CN" })} className="inp">
                      <option value="MN">🇲🇳 Монгол</option>
                      <option value="RU">🇷🇺 ОХУ</option>
                      <option value="CN">🇨🇳 БНХАУ</option>
                    </select>
                  </Field>
                </div>

                {/* Trailer plates */}
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Чиргүүлийн дугаар</div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, trailerPlates: [...form.trailerPlates, ""] })}
                      className="rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] text-primary hover:bg-primary/25"
                    >
                      + Чиргүүл нэмэх
                    </button>
                  </div>
                  {form.trailerPlates.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Чиргүүл бүртгэгдээгүй байна</div>
                  ) : (
                    <div className="space-y-2">
                      {form.trailerPlates.map((tp, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="shrink-0 text-[10px] text-muted-foreground">#{i + 1}</span>
                          <input
                            value={tp}
                            onChange={(e) => {
                              const next = [...form.trailerPlates];
                              next[i] = e.target.value;
                              setForm({ ...form, trailerPlates: next });
                            }}
                            className="inp"
                            placeholder="УБ-1234"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = form.trailerPlates.filter((_, idx) => idx !== i);
                              setForm({ ...form, trailerPlates: next });
                            }}
                            className="shrink-0 rounded border border-destructive/40 bg-destructive/10 px-1.5 py-1 text-[10px] text-destructive hover:bg-destructive/20"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  disabled={creatingAccount}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {creatingAccount ? "Бүртгэл үүсгэж байна..." : editing ? "Хадгалах" : "Нэмэх"}
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
