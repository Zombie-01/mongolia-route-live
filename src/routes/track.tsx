import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { downloadUserInfoPdf } from "@/lib/user-info-pdf";
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
  const { role, customerId, shipments, drivers, markStopDone, markStopPending } = useStore();
  const nav = useNavigate();
  const [query, setQuery] = useState("MN-2041");
  const [submitted, setSubmitted] = useState("MN-2041");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [showDelivered, setShowDelivered] = useState(true);
  const [mode, setMode] = useState<"all" | "truck" | "railway">("all");
  const [language, setLanguage] = useState<"mn" | "ru">("mn");
  const t = trackLocales[language];

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterTrackingIdLocal, setFilterTrackingIdLocal] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    if (!role) nav({ to: "/" });
  }, [role, nav]);

  const companies = Array.from(new Set(shipments.map((s) => s.company).filter(Boolean)));

  const visibleShipments =
    role === "customer" && customerId
      ? shipments.filter((s) => s.shipperId === customerId || s.receiverId === customerId)
      : shipments;
  const typeFilteredShipments =
    mode === "all"
      ? visibleShipments.filter((s) => {
          // If location is missing or default, show as starting from UB
          if (!s.position || (s.position[0] === 0 && s.position[1] === 0)) {
            return true;
          }
          return true;
        })
      : visibleShipments.filter((s) =>
          mode === "truck" ? s.type === "truck" : s.type === "wagon",
        );
  const baseFilteredShipments = showDelivered
    ? typeFilteredShipments
    : typeFilteredShipments.filter((s) => s.status !== "delivered");

  // Apply active/inactive filter
  const activeFilteredShipments = baseFilteredShipments.filter((s) => {
    if (filterActive === "active") return s.status !== "delivered" && s.status !== "stopped";
    if (filterActive === "inactive") return s.status === "delivered" || s.status === "stopped";
    return true;
  });

  // Apply advanced filters
  const filteredShipments = activeFilteredShipments.filter((s) => {
    // Date from filter
    if (filterDateFrom && s.createdAt) {
      const sDate = new Date(s.createdAt);
      const fromDate = new Date(filterDateFrom);
      if (sDate < fromDate) return false;
    }
    // Date to filter
    if (filterDateTo && s.createdAt) {
      const sDate = new Date(s.createdAt);
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (sDate > toDate) return false;
    }
    // Driver filter
    if (filterDriver) {
      const matchDriver = drivers.find((d) => d.id === filterDriver);
      if (matchDriver && s.driver !== matchDriver.name) {
        return false;
      }
    }
    // Tracking number filter
    if (filterTrackingIdLocal) {
      if (!s.trackingId.toLowerCase().includes(filterTrackingIdLocal.toLowerCase())) {
        return false;
      }
    }
    // Company filter (based on shipment.company)
    if (filterCompany) {
      if (!s.company || !s.company.toLowerCase().includes(filterCompany.toLowerCase()))
        return false;
    }
    return true;
  });

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
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground">Харагдах</label>
                <select
                  value={showDelivered ? "all" : "current"}
                  onChange={(e) => setShowDelivered(e.target.value === "all")}
                  className="rounded-md border border-border bg-card/60 px-2 py-1 text-sm outline-none"
                >
                  <option value="all">{t.all}</option>
                  <option value="current">{t.current}</option>
                </select>
              </div>
              <div className="text-xs text-muted-foreground">
                {filteredShipments.length} {t.shipmentsCount}
              </div>
            </div>
            <div className="pt-2">
              <label className="mb-1 block text-[9px] uppercase tracking-wider text-muted-foreground">
                Төрөл
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "all" | "truck" | "railway")}
                className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="all">{t.all}</option>
                <option value="truck">🚚 Машин</option>
                <option value="railway">🚆 Вагон</option>
              </select>
            </div>
            {/* Active/Inactive filter buttons */}
            <div className="pt-2">
              <label className="mb-1 block text-[9px] uppercase tracking-wider text-muted-foreground">
                Статус
              </label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
                className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="all">{t.all}</option>
                <option value="active">{t.active}</option>
                <option value="inactive">Идэвхгүй</option>
              </select>
            </div>
            {/* Shipments list */}
            <div className="space-y-1">
              {filteredShipments.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setQuery(s.trackingId);
                    setSubmitted(s.trackingId);
                    setMobileView("map");
                  }}
                  className="cursor-pointer rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.trackingId}</span>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] ${
                        s.status === "delivered"
                          ? "border-accent/30 bg-accent/15 text-accent"
                          : s.status === "stopped" || s.status === "delayed"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-primary/30 bg-primary/15 text-primary"
                      }`}
                    >
                      {s.status === "delivered"
                        ? t.delivered
                        : s.status === "empty"
                          ? "Хоосон"
                          : s.status === "loading"
                            ? "Ачиж байна"
                            : s.status === "stopped"
                              ? t.stopped
                              : s.status === "delayed"
                                ? t.delayed
                                : t.inTransitState}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {s.origin} → {s.destination}
                  </div>
                </div>
              ))}
            </div>

            {/* Filter section */}
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Шүүлтүүр
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                    Эхлэх өдөр
                  </div>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                    Дуусах өдөр
                  </div>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
              {mode !== "railway" && (
                <div className="mt-2">
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                    Жолооч
                  </div>
                  <select
                    value={filterDriver}
                    onChange={(e) => setFilterDriver(e.target.value)}
                    className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="">Бүгд</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {mode !== "railway" && companies.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                    Компанийн шүүлт
                  </div>
                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="">Бүгд</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="mt-2">
                <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  Хүргэлтийн дугаар
                </div>
                <input
                  type="text"
                  value={filterTrackingIdLocal}
                  onChange={(e) => setFilterTrackingIdLocal(e.target.value)}
                  placeholder="MN-..."
                  className="w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
              {(filterDateFrom ||
                filterDateTo ||
                filterDriver ||
                filterTrackingIdLocal ||
                filterActive !== "all") && (
                <button
                  onClick={() => {
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setFilterDriver("");
                    setFilterTrackingIdLocal("");
                    setFilterActive("all");
                  }}
                  className="mt-2 w-full rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive hover:bg-destructive/20"
                >
                  ✕ Шүүлтүүр арилгах
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!found) return;

                  const matchedDriver = drivers.find(
                    (d) =>
                      d.name === found.driver ||
                      d.vehicleId === found.vehicleId ||
                      d.phone === found.driverPhone,
                  );

                  const statusLabel =
                    found.status === "delivered"
                      ? t.delivered
                      : found.status === "stopped"
                        ? t.stopped
                        : found.status === "loading"
                          ? "Ачиж байна"
                          : found.status === "empty"
                            ? "Хоосон"
                            : found.status === "delayed"
                              ? t.delayed
                              : t.inTransitState;

                  const cargoItems = found.cargoItems
                    .map((item) => `${item.name}: ${item.qty} ${item.unit ?? "тн"}`)
                    .join("; ");

                  const lines = [
                    { label: "Тээшийн дугаар", value: found.trackingId },
                    { label: t.shipmentInfo, value: found.cargo },
                    { label: t.status, value: statusLabel },
                    { label: t.route, value: `${found.origin} → ${found.destination}` },
                    { label: t.speed, value: `${found.speed} км/ц` },
                    { label: t.eta, value: found.eta },
                    {
                      label: t.location,
                      value: `${found.position[0].toFixed(4)}, ${found.position[1].toFixed(4)}`,
                    },
                    { label: "Ачааны нийт жин", value: found.totalWeight || "" },
                    { label: "Тээшийн багтаамж", value: found.capacity || "" },
                    { label: "Ачааны дэлгэрэнгүй", value: cargoItems },
                    { label: "Илгээх", value: found.shipper || "" },
                    { label: "Хүлээн авагч", value: found.consignee || "" },
                  ];

                  if (found.dropoffs.length > 0) {
                    lines.push({ label: "Буулгах цэгүүд", value: "" });
                    for (const [index, dropoff] of found.dropoffs.entries()) {
                      lines.push({
                        label: `#${index + 1} ${dropoff.location}`,
                        value: `ETA ${dropoff.eta} · ${dropoff.status === "done" ? t.done : t.pending}`,
                      });
                    }
                  }

                  lines.push({ label: "", value: "" });
                  lines.push({ label: t.driver, value: found.driver });
                  lines.push({ label: t.phone, value: found.driverPhone });
                  lines.push({ label: t.license, value: found.driverLicense });
                  lines.push({ label: t.experience, value: found.driverExperience });
                  lines.push({ label: "Rating", value: found.driverRating.toFixed(1) });
                  lines.push({ label: t.vehicle, value: found.vehicleId });
                  lines.push({ label: t.plate, value: found.plateNumber });

                  const imageLines = matchedDriver
                    ? [
                        {
                          label: "Профайл зураг",
                          value: matchedDriver.profileImage || "",
                          type: "image",
                        },
                        {
                          label: "Паспорт зураг",
                          value: matchedDriver.passportImage || "",
                          type: "image",
                        },
                        {
                          label: "Тээврийн гэрчилгээ",
                          value: matchedDriver.vehicleCertImage || "",
                          type: "image",
                        },
                        {
                          label: "Чиргүүлийн гэрчилгээ",
                          value: matchedDriver.trailerCertImage || "",
                          type: "image",
                        },
                      ].filter((line) => line.value)
                    : [];

                  try {
                    await downloadUserInfoPdf({
                      title: `Shipment ${found.trackingId}`,
                      filename: `${found.trackingId.replace(/\s+/g, "_")}_shipment.pdf`,
                      lines: [...lines, ...imageLines],
                      notes: "Энэхүү PDF-д тээш болон жолоочийн мэдээлэл багтсан болно.",
                    });
                  } catch (error) {
                    console.warn("Failed to generate shipment PDF", error);
                    window.alert("PDF үүсгэх үед алдаа гарлаа. Дахин оролдоно уу.");
                  }
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
                        : found.status === "empty"
                          ? "Хоосон (авах)"
                          : found.status === "loading"
                            ? "Ачиж байна"
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
                        className="h-full bg-linear-to-r from-primary to-accent"
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
                      value={
                        found.status === "empty"
                          ? "Хоосон (авах)"
                          : found.status === "loading"
                            ? "Ачиж байна"
                            : found.status === "in_transit"
                              ? t.inTransitState
                              : found.status === "delivered"
                                ? t.delivered
                                : t.stopped
                      }
                    />
                  </div>

                  {/* Dropoffs for admin with toggle */}
                  {role === "admin" && found.dropoffs.length > 0 && (
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
                              <div className="flex items-center gap-1.5">
                                {d.status === "done" ? (
                                  <button
                                    onClick={() => markStopPending(found.id, i + 1)}
                                    className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] text-warning hover:bg-warning/25"
                                  >
                                    Буугаагүй болгох
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => markStopDone(found.id, i + 1)}
                                    className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] text-accent hover:bg-accent/25"
                                  >
                                    Буулгасан
                                  </button>
                                )}
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
          <FleetMap
            shipments={found ? [found] : filteredShipments}
            focusId={found?.id}
            onSelect={(id) => {
              const selected = filteredShipments.find((s) => s.id === id);
              if (!selected) return;
              setQuery(selected.trackingId);
              setSubmitted(selected.trackingId);
              setMobileView("map");
            }}
          />
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
