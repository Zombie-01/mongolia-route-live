import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FleetMap } from "@/components/FleetMap";
import { MobileViewToggle } from "@/components/MobileViewToggle";
import { haversineDist } from "@/lib/demo-data";

const driverLocales = {
  mn: {
    activeShipments: "Идэвхтэй ачаа",
    history: "Түүхийн ачаа",
    gpsHeader: "GPS дамжуулалт",
    wagonEstimate: "вагон — цагаар тооцоолно",
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
    inTransit: "Замд",
    stopped: "Зогссон",
    delivered: "Хүргэгдсэн",
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
    inTransit: "В пути",
    stopped: "Остановлен",
    delivered: "Доставлен",
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
    drivers: allDrivers,
    userId: currentUserId,
    startRealGps,
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

  // Жолоочийн хүргэлтүүдийг шүүхдээ:
  // 1. Эхлээд userId-ээр тохирох жолоочийг олох (drivers хүснэгтээс)
  // 2. Тэр жолоочийн нэрээр хүргэлтүүдийг шүүх
  // Энэ нь жолоочийн profile-ийн display_name нь driver-ийн name-тай таарахгүй тохиолдолд ч зөв ажиллана.
  const matchedDriverName = useMemo(() => {
    if (currentUserId && allDrivers.length > 0) {
      const driver = allDrivers.find((d) => d.userId === currentUserId);
      if (driver) return driver.name;
    }
    return name;
  }, [currentUserId, allDrivers, name]);

  const matchedDriverNameLower = matchedDriverName?.trim().toLowerCase() ?? "";
  const myShipments = useMemo(() => {
    return matchedDriverNameLower
      ? shipments
          .filter((s) => s.driver?.trim().toLowerCase() === matchedDriverNameLower)
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
      : [];
  }, [shipments, matchedDriverNameLower]);

  const activeShipments = useMemo(
    () => myShipments.filter((s) => s.status !== "delivered"),
    [myShipments],
  );
  const historyShipments = useMemo(
    () => myShipments.filter((s) => s.status === "delivered"),
    [myShipments],
  );
  const visibleShipments = showDelivered ? historyShipments : activeShipments;
  const current = visibleShipments.find((s) => s.id === active) ?? visibleShipments[0];

  useEffect(() => {
    if (!visibleShipments.length) return;
    if (!active || !visibleShipments.some((s) => s.id === active)) {
      setActive(visibleShipments[0].id);
    }
  }, [active, visibleShipments]);

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

  // Force GPS on for any non-wagon shipment — no toggle, always active
  useEffect(() => {
    const c = visibleShipments.find((s) => s.id === active) ?? visibleShipments[0];
    if (!c || c.type === "wagon") return;
    if (!navigator.geolocation) {
      setGpsError(t.gpsUnsupported);
      return;
    }
    if (!realGpsActive.has(c.id)) {
      const timer = setTimeout(() => {
        startRealGps(c.id);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [active, visibleShipments.length, current?.id]);

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
              {!isWagon && (
                <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[10px] font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  GPS FORCED
                </span>
              )}
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              {t.gpsHeader}{" "}
              {isWagon ? (
                <span className="text-warning">{t.wagonEstimate}</span>
              ) : (
                <span className="text-primary font-medium">Бодит GPS цааш байршил авч байна</span>
              )}
            </div>

            {gpsError && (
              <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                {gpsError}
              </div>
            )}

            {/* Loading info */}
            {current.status === "loading" && (
              <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-blue-500 font-medium">
                  🔵 Ачиж байна — {current.origin} дээр
                </div>
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

            {/* Pickup location - always show */}
            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Ачаа авах цэг
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">📍 {current.origin}</span>
                  {current.status === "empty" && (
                    <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
                      Авах цэг рүү явж байна
                    </span>
                  )}
                  {current.status === "loading" && (
                    <span className="rounded-full border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-500">
                      Ачиж байна
                    </span>
                  )}
                  {current.status === "in_transit" && (
                    <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] text-accent">
                      Ачсан
                    </span>
                  )}
                </div>
                {current.status === "empty" && (
                  <>
                    <div className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
                      <span>📍 Одоо:</span>
                      <span className="tabular-nums">
                        {current.position[0].toFixed(4)}, {current.position[1].toFixed(4)}
                      </span>
                    </div>
                    {current.pickupRoute && current.pickupRoute.length >= 2 && (
                      <div className="mt-1 text-muted-foreground tabular-nums">
                        📏 Зай:{" "}
                        {Math.round(
                          haversineDist(
                            current.pickupRoute[0],
                            current.pickupRoute[current.pickupRoute.length - 1],
                          ) / 1000,
                        )}{" "}
                        км
                      </div>
                    )}
                  </>
                )}
                {current.cargoItems.length > 0 && (
                  <div className="mt-1 text-muted-foreground">
                    Ачаа: {current.cargoItems.map((c) => c.name).join(", ")}
                  </div>
                )}
              </div>
            </div>

            {/* Dropoff stops */}
            {current.dropoffs.length > 0 && current.status !== "empty" && (
              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Буулгах цэгүүд
                </div>
                <div className="space-y-2">
                  {current.dropoffs.map((d, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 text-xs ${
                        d.status === "done"
                          ? "border-accent/40 bg-accent/10"
                          : "border-border bg-card/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {d.status === "done" ? "✅" : `${i + 1}.`} {d.location}
                        </span>
                        <span className="text-muted-foreground tabular-nums">ETA {d.eta}</span>
                      </div>
                      {d.contact && (
                        <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                          <span>📞</span>
                          <span>{d.contact}</span>
                        </div>
                      )}
                      {d.items.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {d.items.map((it, j) => (
                            <span
                              key={j}
                              className="rounded-full border border-border bg-background/60 px-1.5 py-0.5 text-[10px]"
                            >
                              {it.name} {it.qty} {it.unit ?? "тн"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  {t.activeTab} ({activeShipments.length})
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
                  {t.historyTab} ({historyShipments.length})
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
