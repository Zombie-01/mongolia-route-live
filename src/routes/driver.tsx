import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import { MobileViewToggle } from "@/components/MobileViewToggle";
import type { ShipmentStatus } from "@/lib/demo-data";

const driverLocales = {
  mn: {
    activeShipments: "Идэвхтэй ачаа",
    history: "Түүхийн ачаа",
    gpsHeader: "GPS дамжуулалт",
    wagonEstimate: "вагон — цагаар тооцоолно",
    gpsActive: "бодит GPS идэвхтэй",
    gpsLiveLabel: "Бодит GPS цааш байршил авч байна",
    gpsInactive: "GPS идэвхгүй, төхөөрөмжөөс байршил ирээгүй",
    gpsWarning: "GPS асаах шаардлагатай. Та GPS-ээ асаахгүй бол энэ анхааруулга арилахгүй.",
    gpsUnsupported: "Таны төхөөрөмж GPS дэмжихгүй байна",
    noShipments: "Танд одоогоор ямар ч тээш оноогдоогүй байна",
    noHistory: "Танд одоогоор түүхэн ачаа байхгүй байна",
    noActive: "Танд одоогоор идэвхтэй ачаа байхгүй байна",
    pageNote: "Жолоочийн хуудас зөвхөн танд хуваарилагдсан shipment-үүдийг харуулна.",
    cargo: "Ачаа",
    route: "Замнал",
    brigade: "Бригад",
    contact: "Холбогдох",
    driver: "Жолооч",
    vehicle: "Машин",
    speed: "Хурд",
    eta: "ETA",
    location: "Байршил",
    statusHeader: "Төлөв",
    inTransit: "Замд",
    stopped: "Зогссон",
    delivered: "Хүргэгдсэн",
    startTrip: "▶ Аялал эхлүүлэх",
    stopTrip: "■ Зогсоох",
    myShipments: "Миний ачаанууд",
    activeTab: "Идэвхтэй",
    historyTab: "Түүх",
    mnLabel: "🇲🇳 Монгол",
    ruLabel: "🇷🇺 ОХУ",
  },
  ru: {
    activeShipments: "Активные грузы",
    history: "История",
    gpsHeader: "GPS передача",
    wagonEstimate: "вагон — рассчитывается по времени",
    gpsActive: "GPS активен",
    gpsLiveLabel: "GPS продолжает принимать позицию",
    gpsInactive: "GPS неактивен, позиция не получена",
    gpsWarning: "Необходимо включить GPS. Если он не включен, предупреждение не исчезнет.",
    gpsUnsupported: "Ваше устройство не поддерживает GPS",
    noShipments: "Вам пока не назначены грузы",
    noHistory: "У вас пока нет исторических грузов",
    noActive: "У вас пока нет активных грузов",
    pageNote: "Страница водителя показывает только грузы, назначенные вам.",
    cargo: "Груз",
    route: "Маршрут",
    brigade: "Бригада",
    contact: "Контакт",
    driver: "Водитель",
    vehicle: "Транспорт",
    speed: "Скорость",
    eta: "ETA",
    location: "Позиция",
    statusHeader: "Статус",
    inTransit: "В пути",
    stopped: "Остановлен",
    delivered: "Доставлен",
    startTrip: "▶ Начать",
    stopTrip: "■ Остановить",
    myShipments: "Мои грузы",
    activeTab: "Активные",
    historyTab: "История",
    mnLabel: "🇲🇳 Монгол",
    ruLabel: "🇷🇺 Россия",
  },
} as const;

export const Route = createFileRoute("/driver")({
  component: DriverPage,
});

function DriverPage() {
  const {
    role,
    name,
    loading,
    shipments,
    setStatus,
    sharingIds,
    setGpsOnline,
    startRealGps,
    stopRealGps,
    realGpsActive,
  } = useStore();
  const nav = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [showDelivered, setShowDelivered] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"mn" | "ru">("mn");
  const t = driverLocales[language];

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
  }, [role, loading, nav]);

  if (loading || !role) return null;

  const myShipments = name ? shipments.filter((s) => s.driver === name) : [];
  const visibleShipments = showDelivered
    ? myShipments
    : myShipments.filter((s) => s.status !== "delivered");
  const current = visibleShipments.find((s) => s.id === active) ?? visibleShipments[0];

  if (!current) {
    return (
      <AppShell>
        <div className="grid h-full place-items-center p-8 text-center text-sm text-muted-foreground">
          <div className="max-w-md rounded-3xl border border-border bg-background/80 p-8 shadow-sm">
            <div className="text-xl font-semibold">
              {myShipments.length === 0 ? t.noShipments : showDelivered ? t.noHistory : t.noActive}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t.pageNote}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const isWagon = current.type === "wagon";
  const gpsLive = realGpsActive.has(current.id);
  const gpsActive = !isWagon && gpsLive;

  const statusBtns: { v: ShipmentStatus; label: string }[] = [
    { v: "in_transit", label: t.inTransit },
    { v: "stopped", label: t.stopped },
    { v: "delivered", label: t.delivered },
  ];

  const handleGpsToggle = () => {
    if (isWagon) return;
    if (gpsActive) return;
    if (!navigator.geolocation) {
      setGpsError(t.gpsUnsupported);
      setGpsOnline(current.id, true);
      return;
    }
    setGpsError(null);
    startRealGps(current.id);
    setGpsOnline(current.id, true);
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {showDelivered ? t.history : t.activeShipments}
                </div>
                <div className="mt-1 text-lg font-semibold">{current.trackingId}</div>
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
              <button
                onClick={handleGpsToggle}
                disabled={isWagon || gpsActive}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  gpsActive ? "bg-primary" : "bg-secondary"
                } ${isWagon || gpsActive ? "cursor-not-allowed opacity-50" : ""}`}
                aria-label="GPS sharing"
              >
                <motion.span
                  layout
                  className="absolute top-0.5 h-6 w-6 rounded-full bg-background shadow"
                  animate={{ left: gpsActive ? 22 : 2 }}
                />
              </button>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              {t.gpsHeader}{" "}
              {isWagon ? (
                <span className="text-warning">{t.wagonEstimate}</span>
              ) : gpsLive ? (
                <span className="text-primary font-medium">{t.gpsActive}</span>
              ) : (
                <span className="text-warning">{t.gpsInactive}</span>
              )}
            </div>

            {gpsLive && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span className="text-primary font-medium">{t.gpsLiveLabel}</span>
              </div>
            )}

            {!gpsActive && !isWagon && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                <span>⚠️ {t.gpsWarning}</span>
              </div>
            )}

            {gpsError && (
              <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                {gpsError}
              </div>
            )}

            <div className="mt-5 space-y-2 text-sm">
              <Row label={t.cargo} value={current.cargo} />
              <Row label={t.route} value={`${current.origin} → ${current.destination}`} />
              {isWagon ? (
                <>
                  <Row label={t.brigade} value={current.vehicleId} />
                  <Row label={t.contact} value={current.driverPhone} />
                </>
              ) : (
                <>
                  <Row label={t.driver} value={current.driver} />
                  <Row label={t.vehicle} value={current.vehicleId} />
                </>
              )}
              <Row label={t.speed} value={`${current.speed} км/ц`} />
              <Row label={t.eta} value={current.eta} />
              <Row
                label={t.location}
                value={`${current.position[0].toFixed(4)}, ${current.position[1].toFixed(4)}`}
              />
            </div>

            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                {t.statusHeader}
              </div>
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
                {t.startTrip}
              </button>
              <button
                onClick={() => setStatus(current.id, "stopped")}
                className="rounded-lg border border-border bg-card/60 py-2.5 text-sm hover:bg-secondary"
              >
                {t.stopTrip}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between px-1 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{t.myShipments}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDelivered(false)}
                  className={`rounded-full px-2 py-1 text-[11px] transition ${
                    !showDelivered
                      ? "bg-primary text-primary-foreground"
                      : "bg-card/60 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.activeTab}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDelivered(true)}
                  className={`rounded-full px-2 py-1 text-[11px] transition ${
                    showDelivered
                      ? "bg-primary text-primary-foreground"
                      : "bg-card/60 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.historyTab}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {visibleShipments.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActive(s.id);
                    setMobileView("map");
                  }}
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
