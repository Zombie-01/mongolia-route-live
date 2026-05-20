import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import { MobileViewToggle } from "@/components/MobileViewToggle";

const trackLocales = {
  mn: {
    title: "Ачаа хайх",
    subtitle: "Хяналтын дугаараа оруулж шууд хянана уу.",
    placeholder: "MN-2041",
    search: "Хайх",
    all: "Бүх ачаа",
    current: "Одоо яваа",
    shipmentsCount: "ачаа",
    pdf: "PDF татах",
    shipmentInfo: "Ачаа мэдээлэл",
    status: "Төлөв",
    route: "Замнал",
    speed: "Хурд",
    eta: "ETA",
    location: "Байршил",
    driver: "Жолооч",
    phone: "Утас",
    license: "Үнэмлэх",
    experience: "Туршлага",
    vehicle: "Машин",
    plate: "Плат",
    dropoffs: "Буулгах цэгүүд",
    done: "Буулгасан",
    pending: "Хүлээгдэж буй",
    delivered: "Хүргэгдсэн",
    stopped: "Зогссон",
    inTransitState: "Замд",
    delayed: "Хоцрол",
    brigade: "Бригад",
    contact: "Холбогдох",
    notFound: "Хяналтын дугаар олдсонгүй.",
    active: "Идэвхтэй",
    history: "Түүх",
    mnLabel: "🇲🇳 Монгол",
    ruLabel: "🇷🇺 ОХУ",
  },
  ru: {
    title: "Поиск груза",
    subtitle: "Введите номер для быстрого просмотра статуса.",
    placeholder: "MN-2041",
    search: "Найти",
    all: "Все грузы",
    current: "Текущие",
    shipmentsCount: "грузов",
    pdf: "Скачать PDF",
    shipmentInfo: "Информация о грузе",
    status: "Статус",
    route: "Маршрут",
    speed: "Скорость",
    eta: "ETA",
    location: "Позиция",
    driver: "Водитель",
    phone: "Телефон",
    license: "Права",
    experience: "Стаж",
    vehicle: "Транспорт",
    plate: "Номер",
    dropoffs: "Пункты выгрузки",
    done: "Выгружено",
    pending: "В ожидании",
    delivered: "Доставлен",
    stopped: "Остановлен",
    inTransitState: "В пути",
    delayed: "Задержано",
    brigade: "Бригада",
    contact: "Контакт",
    notFound: "Номер не найден.",
    active: "Активные",
    history: "История",
    mnLabel: "🇲🇳 Монгол",
    ruLabel: "🇷🇺 Россия",
  },
} as const;

export const Route = createFileRoute("/track")({
  component: TrackPage,
});

function TrackPage() {
  const { role, customerId, shipments } = useStore();
  const nav = useNavigate();
  const [query, setQuery] = useState("MN-2041");
  const [submitted, setSubmitted] = useState("MN-2041");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [showDelivered, setShowDelivered] = useState(true);
  const [language, setLanguage] = useState<"mn" | "ru">("mn");
  const t = trackLocales[language];

  useEffect(() => {
    if (!role) nav({ to: "/" });
  }, [role, nav]);

  const visibleShipments =
    role === "customer" && customerId
      ? shipments.filter((s) => s.shipperId === customerId || s.receiverId === customerId)
      : shipments;
  const filteredShipments = showDelivered
    ? visibleShipments
    : visibleShipments.filter((s) => s.status !== "delivered");

  const found = filteredShipments.find(
    (s) => s.trackingId.toLowerCase() === submitted.toLowerCase(),
  );

  return (
    <AppShell>
      <MobileViewToggle value={mobileView} onChange={setMobileView} />

      <div className="grid h-full grid-cols-1 lg:grid-cols-[420px_1fr]">
        <aside
          className={`z-10 flex flex-col gap-4 overflow-y-auto border-r border-border bg-background/40 p-5 pb-24 backdrop-blur lg:pb-5 ${
            mobileView === "list" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">{t.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-1">
                <button
                  type="button"
                  onClick={() => setLanguage("mn")}
                  className={`rounded-full px-2 py-1 text-[11px] transition ${
                    language === "mn"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.mnLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("ru")}
                  className={`rounded-full px-2 py-1 text-[11px] transition ${
                    language === "ru"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.ruLabel}
                </button>
              </div>
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
                placeholder={t.placeholder}
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                {t.search}
              </button>
            </form>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowDelivered(true)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    showDelivered
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.all}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDelivered(false)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    !showDelivered
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.current}
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                {filteredShipments.length} {t.shipmentsCount}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredShipments.map((s) => (
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

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!found) return;
                  const content = `<!doctype html><html><head><meta charset="utf-8"><title>Shipment ${found.trackingId}</title><style>body{font-family:sans-serif;color:#111;margin:24px;}h1{font-size:28px;margin-bottom:8px;}h2{font-size:18px;margin:16px 0 8px;}table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{padding:8px;border:1px solid #ccc;text-align:left;}th{background:#f4f4f4;}</style></head><body><h1>Shipment ${found.trackingId}</h1><p><strong>${found.cargo}</strong></p><h2>${t.shipmentInfo}</h2><table><tbody><tr><th>${t.status}</th><td>${found.status === "delivered" ? t.delivered : found.status === "stopped" ? t.stopped : t.inTransitState}</td></tr><tr><th>${t.route}</th><td>${found.origin} → ${found.destination}</td></tr><tr><th>${t.speed}</th><td>${found.speed} км/ц</td></tr><tr><th>${t.eta}</th><td>${found.eta}</td></tr><tr><th>${t.location}</th><td>${found.position[0].toFixed(4)}, ${found.position[1].toFixed(4)}</td></tr></tbody></table><h2>${t.driver}</h2><table><tbody><tr><th>${t.driver}</th><td>${found.driver}</td></tr><tr><th>${t.phone}</th><td>${found.driverPhone}</td></tr><tr><th>${t.license}</th><td>${found.driverLicense}</td></tr><tr><th>${t.experience}</th><td>${found.driverExperience}</td></tr><tr><th>Rating</th><td>${found.driverRating.toFixed(1)}</td></tr><tr><th>${t.vehicle}</th><td>${found.vehicleId}</td></tr><tr><th>${t.plate}</th><td>${found.plateNumber}</td></tr></tbody></table><h2>${t.dropoffs}</h2><table><tbody>${found.dropoffs.map((d, i) => `<tr><th>#${i + 1} ${d.location}</th><td>ETA ${d.eta} · ${d.status === "done" ? t.done : t.pending}</td></tr>`).join("")}</tbody></table></body></html>`;
                  const printWindow = window.open("", "_blank", "width=900,height=700");
                  if (!printWindow) return;
                  printWindow.document.write(content);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }}
                className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                {t.pdf}
              </button>
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
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        {found.trackingId}
                      </div>
                      <div className="mt-1 text-lg font-semibold">{found.cargo}</div>
                    </div>
                    <div className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-[11px] text-primary">
                      {found.status === "delivered"
                        ? t.delivered
                        : found.status === "stopped"
                          ? t.stopped
                          : found.status === "delayed"
                            ? t.delayed
                            : t.inTransitState}
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
                    {found.type === "wagon" ? (
                      <>
                        <Stat label={t.brigade} value={found.vehicleId} />
                        <Stat label={t.contact} value={found.driverPhone} />
                      </>
                    ) : (
                      <>
                        <Stat label={t.driver} value={found.driver} />
                        <Stat label={t.vehicle} value={found.vehicleId} />
                      </>
                    )}
                    <Stat label={t.speed} value={`${found.speed} км/ц`} />
                    <Stat
                      label={t.status}
                      value={found.status === "in_transit" ? t.inTransitState : t.stopped}
                    />
                  </div>

                  {/* Dropoffs for customer */}
                  {found.dropoffs.length > 0 && (
                    <div className="mt-5">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t.dropoffs}
                      </div>
                      <div className="space-y-2">
                        {found.dropoffs.map((d, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-border bg-card/40 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                #{i + 1} {d.location}
                              </span>
                              <span
                                className={`rounded-full border px-1.5 py-0.5 text-[9px] ${
                                  d.status === "done"
                                    ? "border-accent/30 bg-accent/15 text-accent"
                                    : "border-primary/30 bg-primary/15 text-primary"
                                }`}
                              >
                                {d.status === "done" ? t.done : t.pending}
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
                  {t.notFound}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        <div className={`relative ${mobileView === "map" ? "block" : "hidden lg:block"}`}>
          <FleetMap shipments={found ? [found] : filteredShipments} focusId={found?.id} />
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
