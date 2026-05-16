import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CITIES, etaFromKm, suggestWaypoints, totalRouteKm, findCity } from "@/lib/cities";
import type { CargoItem, LatLng, Shipment, ShipmentStatus, VehicleType } from "@/lib/demo-data";

interface Props {
  open: boolean;
  initial?: Shipment | null;
  onClose: () => void;
  onSave: (s: Shipment) => void;
}

function emptyShipment(): Shipment {
  const id = `s_${Math.random().toString(36).slice(2, 8)}`;
  const ub = CITIES.find((c) => c.name === "Улаанбаатар")!;
  const dest = CITIES.find((c) => c.name === "Дархан")!;
  const route: LatLng[] = [ub.position, dest.position];
  const km = totalRouteKm(route);
  return {
    id,
    trackingId: `MN-${Math.floor(2100 + Math.random() * 900)}`,
    cargo: "Малын тэжээл",
    origin: ub.name,
    destination: dest.name,
    driver: "",
    vehicleId: "",
    status: "in_transit",
    route,
    progress: 0,
    speed: 0,
    eta: etaFromKm(km),
    position: ub.position,
    type: "truck",
    country: "MN",
    driverPhone: "",
    driverLicense: "B/C",
    driverExperience: "1 жил",
    driverRating: 4.5,
    plateNumber: "",
    capacity: "20 тн",
    shipper: "Тэжээл Трейд ХХК",
    consignee: "",
    totalWeight: "0 тн",
    cargoItems: [{ name: "Овьёос", qty: 5 }],
    dropoffs: [
      {
        location: dest.name,
        position: dest.position,
        items: [{ name: "Овьёос", qty: 5 }],
        eta: etaFromKm(km),
        status: "pending",
      },
    ],
  };
}

export function ShipmentFormModal({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<Shipment>(() => initial ?? emptyShipment());
  const [originName, setOriginName] = useState(initial?.origin ?? "Улаанбаатар");
  const [destName, setDestName] = useState(initial?.destination ?? "Дархан");
  const [waypointNames, setWaypointNames] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const f = initial ?? emptyShipment();
    setForm(f);
    setOriginName(f.origin);
    setDestName(f.destination);
    setWaypointNames([]);
  }, [open, initial]);

  const originCity = useMemo(() => findCity(originName), [originName]);
  const destCity = useMemo(() => findCity(destName), [destName]);

  const autoSuggested = useMemo(() => {
    if (!originCity || !destCity) return [] as string[];
    const pts = suggestWaypoints(originCity.position, destCity.position, 4);
    return pts
      .map((p) => CITIES.find((c) => c.position[0] === p[0] && c.position[1] === p[1])?.name)
      .filter((n): n is string => Boolean(n));
  }, [originCity, destCity]);

  useEffect(() => {
    if (!open) return;
    setWaypointNames(autoSuggested);
  }, [autoSuggested, open]);

  const computed = useMemo(() => {
    if (!originCity || !destCity) return null;
    const wpPositions = waypointNames
      .map((n) => findCity(n)?.position)
      .filter((p): p is LatLng => Boolean(p));
    const route: LatLng[] = [originCity.position, ...wpPositions, destCity.position];
    const km = totalRouteKm(route);
    const eta = etaFromKm(km);
    const total = form.cargoItems.reduce((sum, c) => sum + (Number(c.qty) || 0), 0);
    return { route, km, eta, total };
  }, [originCity, destCity, waypointNames, form.cargoItems]);

  const toggleWaypoint = (name: string) => {
    setWaypointNames((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
  };

  const updateItem = (i: number, patch: Partial<CargoItem>) =>
    setForm((f) => ({ ...f, cargoItems: f.cargoItems.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));

  const addItem = () =>
    setForm((f) => ({ ...f, cargoItems: [...f.cargoItems, { name: "", qty: 1 }] }));

  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, cargoItems: f.cargoItems.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    if (!computed || !originCity || !destCity) return;
    const total = computed.total;
    const finalShipment: Shipment = {
      ...form,
      origin: originName,
      destination: destName,
      route: computed.route,
      roadRoute: undefined,
      eta: computed.eta,
      position: initial ? form.position : computed.route[0],
      totalWeight: `${total} тн`,
      dropoffs: [
        {
          location: destName,
          position: destCity.position,
          items: form.cargoItems,
          eta: computed.eta,
          status: "pending",
        },
      ],
    };
    onSave(finalShipment);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 10000 }}
          className="fixed inset-0 grid place-items-center bg-background/70 p-4 backdrop-blur"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {initial ? "Хүргэлт засах" : "Шинэ хүргэлт"}
                </div>
                <h3 className="mt-1 text-xl font-semibold">
                  {originName} → {destName}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <Section title="Үндсэн мэдээлэл">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="Хяналтын дугаар">
                    <input
                      value={form.trackingId}
                      onChange={(e) => setForm({ ...form, trackingId: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Тээврийн төрөл">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })}
                      className="inp"
                    >
                      <option value="truck">🚚 Машин</option>
                      <option value="wagon">🚆 Вагон</option>
                    </select>
                  </Field>
                  <Field label="Илгээх улс">
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value as "MN" | "RU" | "CN" })}
                      className="inp"
                    >
                      <option value="MN">🇲🇳 Монгол</option>
                      <option value="RU">🇷🇺 ОХУ</option>
                      <option value="CN">🇨🇳 БНХАУ</option>
                    </select>
                  </Field>
                  <Field label="Ачааны нэр" wide>
                    <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Төлөв">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as ShipmentStatus })}
                      className="inp"
                    >
                      <option value="in_transit">Замд</option>
                      <option value="stopped">Зогссон</option>
                      <option value="delayed">Хоцрол</option>
                      <option value="delivered">Хүргэгдсэн</option>
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Маршрут">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Эхлэх хот">
                    <select value={originName} onChange={(e) => setOriginName(e.target.value)} className="inp">
                      {CITIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Хүрэх хот">
                    <select value={destName} onChange={(e) => setDestName(e.target.value)} className="inp">
                      {CITIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Дундын зогсоол / өртөө (авто санал)
                    </div>
                    <button
                      type="button"
                      onClick={() => setWaypointNames(autoSuggested)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Автоматаар тааруулах
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card/40 p-2">
                    {CITIES.filter((c) => c.name !== originName && c.name !== destName).map((c) => {
                      const active = waypointNames.includes(c.name);
                      const suggested = autoSuggested.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => toggleWaypoint(c.name)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            active
                              ? "border-primary/50 bg-primary/20 text-primary"
                              : suggested
                                ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                                : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {computed && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <Stat label="Зайн урт" value={`${Math.round(computed.km)} км`} />
                    <Stat label="Зорчих хугацаа (авто)" value={computed.eta} />
                    <Stat label="Зогсоол" value={`${waypointNames.length} цэг`} />
                  </div>
                )}
              </Section>

              <Section title="Жолооч / Бригад">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="Нэр" wide>
                    <input value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Утас">
                    <input value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Үнэмлэх">
                    <input value={form.driverLicense} onChange={(e) => setForm({ ...form, driverLicense: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Туршлага">
                    <input value={form.driverExperience} onChange={(e) => setForm({ ...form, driverExperience: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Улсын дугаар">
                    <input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value, vehicleId: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Даац">
                    <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="inp" />
                  </Field>
                </div>
              </Section>

              <Section title="Талууд">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Илгээгч">
                    <input value={form.shipper} onChange={(e) => setForm({ ...form, shipper: e.target.value })} className="inp" />
                  </Field>
                  <Field label="Хүлээн авагч">
                    <input value={form.consignee} onChange={(e) => setForm({ ...form, consignee: e.target.value })} className="inp" />
                  </Field>
                </div>
              </Section>

              <Section title={`Ачаа (${form.cargoItems.reduce((s, c) => s + (Number(c.qty) || 0), 0)} тн)`}>
                <div className="space-y-2">
                  {form.cargoItems.map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_90px_1fr_auto] gap-2">
                      <input
                        placeholder="Бүтээгдэхүүн (ж: Овьёос)"
                        value={c.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                        className="inp"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={c.qty}
                        onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                        className="inp tabular-nums"
                      />
                      <input
                        placeholder="Тэмдэглэл"
                        value={c.note ?? ""}
                        onChange={(e) => updateItem(i, { note: e.target.value })}
                        className="inp"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="rounded-md border border-border bg-card/60 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    + Бүтээгдэхүүн нэмэх
                  </button>
                </div>
              </Section>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-background/40 p-4">
              <button onClick={onClose} className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm">
                Болих
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {initial ? "Хадгалах" : "Хүргэлт үүсгэх"}
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
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  );
}
