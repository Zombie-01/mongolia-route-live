import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Shipment } from "@/lib/demo-data";

const statusLabel: Record<Shipment["status"], string> = {
  in_transit: "Замд",
  stopped: "Зогссон",
  delayed: "Хоцрол",
  delivered: "Хүргэгдсэн",
};

const statusCls: Record<Shipment["status"], string> = {
  in_transit: "bg-primary/15 text-primary border-primary/30",
  stopped: "bg-warning/15 text-warning border-warning/30",
  delayed: "bg-destructive/15 text-destructive border-destructive/40",
  delivered: "bg-accent/15 text-accent border-accent/30",
};

const countryLabel: Record<string, string> = {
  MN: "🇲🇳 Монгол",
  RU: "🇷🇺 ОХУ",
  CN: "🇨🇳 БНХАУ",
};

interface Props {
  shipment: Shipment | null;
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOverrideGPS?: (id: string, lat: number, lng: number) => void;
}

export function ShipmentDetailModal({ shipment, onClose, isAdmin, onEdit, onDelete, onOverrideGPS }: Props) {
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [gpsOpen, setGpsOpen] = useState(false);

  useEffect(() => {
    if (shipment) {
      setGpsLat(shipment.position[0].toFixed(5));
      setGpsLng(shipment.position[1].toFixed(5));
      setGpsOpen(false);
    }
  }, [shipment?.id, shipment]);

  return (
    <AnimatePresence>
      {shipment && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 10000 }}
          className="fixed inset-0 grid place-items-center bg-background/70 p-4 backdrop-blur"
        >
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <span>{shipment.trackingId}</span>
                  <span>·</span>
                  <span>{shipment.type === "wagon" ? "🚆 Вагон" : "🚚 Ачааны машин"}</span>
                  <span>·</span>
                  <span>{countryLabel[shipment.country ?? "MN"]}</span>
                </div>
                <h3 className="mt-1 truncate text-xl font-semibold">{shipment.cargo}</h3>
                <div className="mt-1 text-xs text-muted-foreground">
                  {shipment.shipper} → {shipment.consignee}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] ${statusCls[shipment.status]}`}>
                  {statusLabel[shipment.status]}
                </span>
                {isAdmin && onEdit && (
                  <button
                    onClick={() => onEdit(shipment.id)}
                    className="rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs text-primary hover:bg-primary/25"
                  >
                    ✎ Засах
                  </button>
                )}
                {isAdmin && onDelete && (
                  <button
                    onClick={() => {
                      if (confirm("Энэ хүргэлтийг устгах уу?")) {
                        onDelete(shipment.id);
                        onClose();
                      }
                    }}
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"
                  >
                    🗑
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* Progress */}
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{shipment.origin}</span>
                  <span className="tabular-nums">{Math.round(shipment.progress * 100)}% · ETA {shipment.eta}</span>
                  <span>{shipment.destination}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    animate={{ width: `${Math.round(shipment.progress * 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Driver */}
              <Section title="Жолооч / Бригад">
                <div className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{shipment.driver}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Туршлага {shipment.driverExperience} · Үнэлгээ ⭐ {shipment.driverRating.toFixed(1)}
                      </div>
                    </div>
                    <a
                      href={`tel:${shipment.driverPhone.replace(/\s/g, "")}`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      📞 Залгах
                    </a>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <Mini label="Утас" value={shipment.driverPhone} />
                    <Mini label="Үнэмлэх" value={shipment.driverLicense} />
                    <Mini label="Улсын дугаар" value={shipment.plateNumber} />
                    <Mini label="Даацын чадал" value={shipment.capacity} />
                  </div>
                </div>
              </Section>

              {/* Cargo manifest */}
              <Section title={`Ачааны жагсаалт — нийт ${shipment.totalWeight}`}>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-card/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Бүтээгдэхүүн</th>
                        <th className="px-3 py-2 text-right">Хэмжээ</th>
                        <th className="px-3 py-2 text-left">Тэмдэглэл</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipment.cargoItems.map((c, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{c.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.qty} {c.unit ?? "тн"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{c.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Dropoffs */}
              <Section title="Буулгах цэгүүд">
                <div className="space-y-2">
                  {shipment.dropoffs.map((d, i) => (
                    <div key={i} className="glass rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">
                            #{i + 1} · {d.location}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {d.position[0].toFixed(4)}°N, {d.position[1].toFixed(4)}°E · ETA {d.eta}
                          </div>
                          {d.contact && (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">Холбогдох: {d.contact}</div>
                          )}
                        </div>
                        <span
                          className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] ${
                            d.status === "done"
                              ? "border-accent/30 bg-accent/15 text-accent"
                              : "border-primary/30 bg-primary/15 text-primary"
                          }`}
                        >
                          {d.status === "done" ? "Буулгасан" : "Хүлээгдэж буй"}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-xs">
                        {d.items.map((it, j) => (
                          <li key={j} className="flex justify-between border-t border-border/60 py-1">
                            <span className="text-muted-foreground">{it.name}</span>
                            <span className="font-medium tabular-nums">{it.qty} {it.unit ?? "тн"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Telemetry */}
              <Section title="Тээврийн төлөв">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Mini label="Хурд" value={`${shipment.speed} км/ц`} />
                  <Mini label="ETA" value={shipment.eta} />
                  <Mini label="Төлөв" value={statusLabel[shipment.status]} />
                  <Mini
                    label="Сүүлийн GPS"
                    value={`${shipment.position[0].toFixed(3)}, ${shipment.position[1].toFixed(3)}`}
                  />
                </div>
              </Section>

              {/* Admin: manual GPS override (when network drops) */}
              {isAdmin && onOverrideGPS && (
                <Section title="GPS гарын засвар (сүлжээ тасрах үед)">
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                    {!gpsOpen ? (
                      <button
                        onClick={() => setGpsOpen(true)}
                        className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-foreground hover:border-warning/50"
                      >
                        📍 GPS байршил гараар тааруулах
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[11px] text-muted-foreground">
                          Сүлжээгүй бүсэд жолоочтой утсаар холбогдож одоогийн координатыг шинэчилнэ.
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={gpsLat}
                            onChange={(e) => setGpsLat(e.target.value)}
                            placeholder="Lat (47.9184)"
                            className="rounded-md border border-border bg-card px-2 py-1.5 text-xs tabular-nums outline-none focus:border-primary"
                          />
                          <input
                            value={gpsLng}
                            onChange={(e) => setGpsLng(e.target.value)}
                            placeholder="Lng (106.9177)"
                            className="rounded-md border border-border bg-card px-2 py-1.5 text-xs tabular-nums outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setGpsOpen(false)}
                            className="rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs"
                          >
                            Болих
                          </button>
                          <button
                            onClick={() => {
                              const la = parseFloat(gpsLat);
                              const ln = parseFloat(gpsLng);
                              if (Number.isFinite(la) && Number.isFinite(ln)) {
                                onOverrideGPS(shipment.id, la, ln);
                                setGpsOpen(false);
                              }
                            }}
                            className="rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                          >
                            Шинэчлэх
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              )}
            </div>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs font-medium">{value}</div>
    </div>
  );
}
