import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, type Driver } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { downloadUserInfoPdf } from "@/lib/user-info-pdf";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/drivers")({
  component: DriversPage,
});

const DEFAULT_TRANSPORT_COMPANIES = [
  "Монгол Транс",
  "Алтан Тээвэр",
  "Тэнгэр Тээвэр",
  "Наран Тээвэр",
];

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
    passportImage: "",
    profileImage: "",
    accountNumber: "",
    mongoliaPhone: "",
    russiaPhone: "",
    email: "",
    userId: undefined,
    vehicleCertImage: "",
    trailerCertImage: "",
  };
}

const PAGE_SIZE = 10;

function DriversPage() {
  const {
    role,
    loading,
    drivers,
    addDriver,
    updateDriver,
    removeDriver,
    createUserAccount,
    updateUserAccount,
  } = useStore();
  const nav = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Driver>(emptyDriver());
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [vehicleCertFile, setVehicleCertFile] = useState<File | null>(null);
  const [trailerCertFile, setTrailerCertFile] = useState<File | null>(null);
  const [detailDriver, setDetailDriver] = useState<Driver | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [transportCompanies] = useState<string[]>(DEFAULT_TRANSPORT_COMPANIES);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    // init
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

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

  const filteredDrivers = drivers;
  const visibleDrivers = filteredDrivers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredDrivers.length;

  const openNew = () => {
    setEditing(null);
    setForm(emptyDriver());
    setAccountEmail("");
    setAccountPassword("");
    setProfileFile(null);
    setPassportFile(null);
    setVehicleCertFile(null);
    setTrailerCertFile(null);
    setAccountError(null);
    setAccountCreated(false);
    setFormOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({ ...d });
    setProfileFile(null);
    setPassportFile(null);
    setVehicleCertFile(null);
    setTrailerCertFile(null);
    setAccountEmail(d.email ?? "");
    setAccountPassword("");
    setAccountError(null);
    setCreatingAccount(false);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing && accountPassword && accountPassword.length < 6) {
      setAccountError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }
    // If editing, optionally upload new passport image then update
    if (editing) {
      let passportUrl = form.passportImage;
      let profileUrl = form.profileImage;
      let vehicleCertUrl = form.vehicleCertImage;
      let trailerCertUrl = form.trailerCertImage;

      if (passportFile) {
        const ext = passportFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const path = `driver-passports/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("driver-passports")
          .upload(path, passportFile, { upsert: true });
        if (uploadError) {
          setAccountError("Зураг байрлуулахад алдаа: " + uploadError.message);
          return;
        }
        const { data: urlData } = await supabase.storage
          .from("driver-passports")
          .getPublicUrl(path);
        passportUrl = urlData.publicUrl;
      }

      if (profileFile) {
        const ext = profileFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const path = `driver-profiles/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("driver-profiles")
          .upload(path, profileFile, { upsert: true });
        if (uploadError) {
          setAccountError("Профайл зураг байрлуулахад алдаа: " + uploadError.message);
          return;
        }
        const { data: urlData } = await supabase.storage.from("driver-profiles").getPublicUrl(path);
        profileUrl = urlData.publicUrl;
      }

      if (vehicleCertFile) {
        const ext = vehicleCertFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const path = `vehicle-certs/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("driver-documents")
          .upload(path, vehicleCertFile, { upsert: true });
        if (uploadError) {
          setAccountError(
            "Тээврийн хэрэгслийн гэрчилгээ байрлуулахад алдаа: " + uploadError.message,
          );
          return;
        }
        const { data: urlData } = await supabase.storage
          .from("driver-documents")
          .getPublicUrl(path);
        vehicleCertUrl = urlData.publicUrl;
      }

      if (trailerCertFile) {
        const ext = trailerCertFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const path = `trailer-certs/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("driver-documents")
          .upload(path, trailerCertFile, { upsert: true });
        if (uploadError) {
          setAccountError("Чиргүүлийн гэрчилгээ байрлуулахад алдаа: " + uploadError.message);
          return;
        }
        const { data: urlData } = await supabase.storage
          .from("driver-documents")
          .getPublicUrl(path);
        trailerCertUrl = urlData.publicUrl;
      }

      const updated = {
        ...form,
        passportImage: passportUrl,
        profileImage: profileUrl,
        vehicleCertImage: vehicleCertUrl,
        trailerCertImage: trailerCertUrl,
        email: accountEmail || undefined,
      };

      if (editing.userId) {
        const result = await updateUserAccount({
          userId: editing.userId,
          email: accountEmail || undefined,
          password: accountPassword || undefined,
          display_name: form.name,
          phone: form.phone || undefined,
        });
        if (result.error) {
          setAccountError(result.error);
          return;
        }
      }

      updateDriver(editing.id, updated);

      // Build complete update payload with all fields
      const updatePayload: any = {
        name: form.name,
        phone: form.phone,
        license: form.license,
        experience: form.experience,
        rating: form.rating,
        plate_number: form.plateNumber,
        vehicle_id: form.vehicleId,
        capacity: form.capacity,
        type: form.type,
        country: form.country,
        active: form.active,
        trailer_plates: form.trailerPlates.join(", ") || null,
        email: accountEmail || null,
        passport_photo_url: passportUrl,
        profile_photo_url: profileUrl,
        vehicle_cert_url: vehicleCertUrl,
        trailer_cert_url: trailerCertUrl,
        // Add optional fields if they exist
        ...(form.accountNumber && { account_number: form.accountNumber }),
        ...(form.mongoliaPhone && { mongolia_phone: form.mongoliaPhone }),
        ...(form.russiaPhone && { russia_phone: form.russiaPhone }),
      };

      await supabase.from("drivers").update(updatePayload).eq("id", editing.id);
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
    const driverWithUser = { ...form, email: accountEmail, userId: result.user_id };
    // if user selected files, upload them and attach URLs
    let passportUrl: string | undefined = form.passportImage;
    let profileUrl: string | undefined = form.profileImage;
    let vehicleCertUrl: string | undefined = form.vehicleCertImage;
    let trailerCertUrl: string | undefined = form.trailerCertImage;

    if (passportFile) {
      const ext = passportFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const path = `driver-passports/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("driver-passports")
        .upload(path, passportFile, { upsert: true });
      if (uploadError) {
        setCreatingAccount(false);
        setAccountError("Зураг байрлуулахад алдаа: " + uploadError.message);
        return;
      }
      const { data: urlData } = await supabase.storage.from("driver-passports").getPublicUrl(path);
      passportUrl = urlData.publicUrl;
      driverWithUser.passportImage = passportUrl;
    }
    if (profileFile) {
      const ext = profileFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const path = `driver-profiles/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("driver-profiles")
        .upload(path, profileFile, { upsert: true });
      if (uploadError) {
        setCreatingAccount(false);
        setAccountError("Профайл зураг байрлуулахад алдаа: " + uploadError.message);
        return;
      }
      const { data: urlData } = await supabase.storage.from("driver-profiles").getPublicUrl(path);
      profileUrl = urlData.publicUrl;
      driverWithUser.profileImage = profileUrl;
    }

    if (vehicleCertFile) {
      const ext = vehicleCertFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const path = `vehicle-certs/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(path, vehicleCertFile, { upsert: true });
      if (uploadError) {
        setCreatingAccount(false);
        setAccountError("Тээврийн хэрэгслийн гэрчилгээ байрлуулахад алдаа: " + uploadError.message);
        return;
      }
      const { data: urlData } = await supabase.storage.from("driver-documents").getPublicUrl(path);
      vehicleCertUrl = urlData.publicUrl;
      driverWithUser.vehicleCertImage = vehicleCertUrl;
    }

    if (trailerCertFile) {
      const ext = trailerCertFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const path = `trailer-certs/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(path, trailerCertFile, { upsert: true });
      if (uploadError) {
        setCreatingAccount(false);
        setAccountError("Чиргүүлийн гэрчилгээ байрлуулахад алдаа: " + uploadError.message);
        return;
      }
      const { data: urlData } = await supabase.storage.from("driver-documents").getPublicUrl(path);
      trailerCertUrl = urlData.publicUrl;
      driverWithUser.trailerCertImage = trailerCertUrl;
    }

    await addDriver(driverWithUser);

    try {
      await downloadUserInfoPdf({
        title: "Жолоочийн мэдээллийн PDF",
        filename: `${form.name.replace(/\s+/g, "_") || driverWithUser.id}_driver_info.pdf`,
        lines: [
          { label: "Нэвтрэх мэдээлэл", value: "", type: "section" },
          { label: "Нэр", value: form.name },
          { label: "Утас", value: form.phone || "" },
          { label: "Email", value: accountEmail },
          { label: "Password", value: accountPassword },
          { label: "Тээврийн мэдээлэл", value: "", type: "section" },
          { label: "Цагийн ангилал", value: form.type === "wagon" ? "Вагон" : "Машин" },
          { label: "Тусгай дугаар", value: form.vehicleId || "" },
          { label: "Платны дугаар", value: form.plateNumber || "" },
          { label: "Хүртээмж", value: form.capacity || "" },
          { label: "Лиценз", value: form.license || "" },
          { label: "Туршлага", value: form.experience ? `${form.experience} жил` : "" },

          { label: "Зураг ба баримт бичиг", value: "", type: "section" },
          { label: "Passport зураг", value: passportUrl || "", type: "image" },
          { label: "Профайл зураг", value: profileUrl || "", type: "image" },
          { label: "Тээврийн хэрэгслийн гэрчилгээ", value: vehicleCertUrl || "", type: "image" },
          { label: "Чиргүүлийн гэрчилгээ", value: trailerCertUrl || "", type: "image" },
        ],
        notes:
          "Энэхүү PDF-д таны системд нэвтрэх ашиглагчийн мэдээлэл, имэйл, нууц үг болон жолоочийн мэдээлэл багтсан болно.",
      });
    } catch (e) {
      console.warn("Failed to generate driver PDF", e);
    }

    window.alert(
      `✅ Шинэ жолооч амжилттай үүсгэгдлээ!\n\n` +
        `📋 Нэр: ${form.name}\n` +
        `📧 И-мэйл: ${accountEmail}\n` +
        `🔑 Нууц үг: ${accountPassword}\n` +
        `📞 Утас: ${form.phone || "Байхгүй"}\n` +
        `🚚 Төрөл: ${form.type === "wagon" ? "Вагон" : "Машин"}\n` +
        `🆔 ID: ${form.vehicleId || form.plateNumber || "Байхгүй"}\n\n` +
        `📄 Мэдээллийн PDF файл татагдсан.`,
    );

    setCreatingAccount(false);
    setAccountCreated(true);
    setFormOpen(false);
  };

  const typeLabel = (t: string) => (t === "wagon" ? "🚆 Вагон" : "🚚 Машин");

  const downloadJson = (d: Driver) => {
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.name.replace(/\s+/g, "_") || d.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadImage = async (url: string | undefined, filename: string) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const downloadDriverPdf = async (driver: Driver) => {
    try {
      await downloadUserInfoPdf({
        title: "Жолоочийн бүрэн мэдээлэл",
        filename: `${driver.name.replace(/\s+/g, "_") || driver.id}_driver_info.pdf`,
        lines: [
          { label: "Жолоочийн үндсэн мэдээлэл", value: "", type: "section" },
          { label: "Нэр", value: driver.name },
          { label: "Утас", value: driver.phone || "-" },
          { label: "Email", value: driver.email || "-" },
          { label: "Төрөл", value: typeLabel(driver.type) },
          { label: "Машин", value: driver.vehicleId || "-" },
          { label: "Платны дугаар", value: driver.plateNumber || "-" },
          { label: "Даац", value: driver.capacity || "-" },
          { label: "Лиценз", value: driver.license || "-" },
          { label: "Туршлага", value: driver.experience ? `${driver.experience} жил` : "-" },

          { label: "Үнэлгээ", value: `⭐ ${driver.rating.toFixed(1)}` },
          { label: "Чиргүүлийн мэдээлэл", value: "", type: "section" },
          {
            label: "Чиргүүлийн дугаар",
            value: driver.trailerPlates.length > 0 ? driver.trailerPlates.join(", ") : "-",
          },
          { label: "Зураг ба баримт бичиг", value: "", type: "section" },
          { label: "Профайл зураг", value: driver.profileImage || "", type: "image" },
          { label: "Паспорын зураг", value: driver.passportImage || "", type: "image" },
          { label: "Тээврийн гэрчилгээ", value: driver.vehicleCertImage || "", type: "image" },
          { label: "Чиргүүлийн гэрчилгээ", value: driver.trailerCertImage || "", type: "image" },
        ],
        notes:
          "Энэхүү PDF-д жолоочийн бүрэн мэдээлэл болон зурагнууд багтсан бөгөөд нууц үг агуулсангүй.",
      });
    } catch (e) {
      console.warn("Failed to generate driver PDF", e);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-6 pb-24">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Жолооч нар</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Жолооч, бригадын мэдээлэл удирдлага
              </p>
            </div>
            <button
              onClick={openNew}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + Шинэ жолооч
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-1 lg:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Шүүж байгаагийн тоо
                  </div>
                  <div className="mt-2 text-sm text-foreground">
                    {filteredDrivers.length} жолооч
                  </div>
                </div>
              </div>
            </div>
            {visibleDrivers.map((d) => {
              if (isMobile) {
                return (
                  <motion.div key={d.id} layout className="glass w-full rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={d.profileImage || "/profile-placeholder.png"}
                        alt={d.name}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold truncate">{d.name}</span>
                          <span className="text-xs text-muted-foreground">{typeLabel(d.type)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.phone} · {d.plateNumber}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {d.trailerPlates.length > 0 ? d.trailerPlates.join(", ") : ""}
                        </div>
                      </div>
                      <div className="ml-auto flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDetailDriver(d)}
                            className="rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-muted-foreground"
                          >
                            👁
                          </button>
                          <button
                            onClick={() => openEdit(d)}
                            className="rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-xs text-primary"
                          >
                            ✎
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`${d.name}-г устгах уу?`)) removeDriver(d.id);
                          }}
                          className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              }
              return (
                <motion.div key={d.id} layout className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <img
                          src={d.profileImage || "/profile-placeholder.png"}
                          alt={d.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <span className="text-base font-semibold">{d.name}</span>

                        <span className="text-xs text-muted-foreground">{typeLabel(d.type)}</span>
                        {!d.active && (
                          <span className="rounded-full border border-warning/40 bg-warning/15 px-1.5 py-0.5 text-[9px] text-warning">
                            Идэвхгүй
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                        <span>Утас: {d.phone}</span>
                        <span>И-мэйл: {d.email || "-"}</span>

                        <span>Дугаар: {d.plateNumber}</span>
                        <span>Туршлага: {d.experience} жил</span>
                        <span>Даац: {d.capacity}</span>
                        <span>Үнэлгээ: ⭐ {d.rating.toFixed(1)}</span>
                        {d.trailerPlates.length > 0 && (
                          <span className="col-span-2">Чиргүүл: {d.trailerPlates.join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDetailDriver(d)}
                        className="rounded-md border border-border bg-card/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        👁 Харах
                      </button>
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
              );
            })}

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
            className="fixed inset-0 flex items-center justify-center bg-background/70 p-4 backdrop-blur"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass flex w-full max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-2xl"
            >
              <div className="border-b border-border p-4 sm:p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {editing ? "Жолооч засах" : "Шинэ жолооч"}
                </div>
                <h3 className="mt-1 truncate text-lg font-semibold">
                  {form.name || "Шинэ жолооч"}
                </h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                {/* Auth account section */}
                {editing ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      Нэвтрэх бүртгэл засах
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      И-мэйл хаяг бол одоогийн бүртгэлтэй холбоотой. Нууц үгийг өөрчлөх бол доорх
                      талбарыг бөглөнө үү.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                      <Field label="И-мэйл">
                        <input
                          type="email"
                          value={accountEmail}
                          onChange={(e) => {
                            setAccountEmail(e.target.value);
                            setAccountError(null);
                          }}
                          className="inp"
                          placeholder="driver@company.mn"
                        />
                      </Field>
                      <Field label="Шинэ нууц үг">
                        <input
                          type="password"
                          value={accountPassword}
                          onChange={(e) => {
                            setAccountPassword(e.target.value);
                            setAccountError(null);
                          }}
                          className="inp"
                          placeholder="Хэрэв өөрчлөхгүй бол хоосон байлга"
                        />
                      </Field>
                    </div>
                    {accountError && (
                      <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {accountError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      Нэвтрэх бүртгэл үүсгэх
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      Жолооч системд нэвтрэхийн тулд и-мэйл болон нууц үг оруулна уу. Энэ бүртгэлээр
                      жолооч өөрийн самбарт нэвтэрнэ.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                      <Field label="И-мэйл">
                        <input
                          type="email"
                          value={accountEmail}
                          onChange={(e) => {
                            setAccountEmail(e.target.value);
                            setAccountError(null);
                          }}
                          className="inp"
                          placeholder="driver@company.mn"
                        />
                      </Field>
                      <Field label="Нууц үг">
                        <input
                          type="password"
                          value={accountPassword}
                          onChange={(e) => {
                            setAccountPassword(e.target.value);
                            setAccountError(null);
                          }}
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

                {/* Profile image field */}
                <div className="mb-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Профайл зураг
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setProfileFile(f);
                      if (f) setForm({ ...form, profileImage: "" });
                    }}
                    className="inp"
                  />
                  {form.profileImage && !profileFile && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Суулгасан зураг:
                      <a
                        href={form.profileImage}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary"
                      >
                        харах
                      </a>
                    </div>
                  )}
                  {profileFile && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Файл сонгогдсоно: {profileFile.name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Нэр">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Үндсэн утас">
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Монгол утас">
                    <input
                      value={form.mongoliaPhone || ""}
                      onChange={(e) => setForm({ ...form, mongoliaPhone: e.target.value })}
                      className="inp"
                      placeholder="+976 ..."
                    />
                  </Field>
                  <Field label="Орос утас">
                    <input
                      value={form.russiaPhone || ""}
                      onChange={(e) => setForm({ ...form, russiaPhone: e.target.value })}
                      className="inp"
                      placeholder="+7 ..."
                    />
                  </Field>
                  <Field label="Үнэмлэх">
                    <input
                      value={form.license}
                      onChange={(e) => setForm({ ...form, license: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Туршлага (жил)">
                    <input
                      type="number"
                      min={0}
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Үнэлгээ (0-5)">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={form.rating}
                      onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Улсын дугаар">
                    <input
                      value={form.plateNumber}
                      onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Машин ID">
                    <input
                      value={form.vehicleId}
                      onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Даац">
                    <input
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="Гадаад паспортын зураг">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setPassportFile(f);
                        // clear any existing URL in the form until upload completes
                        if (f) setForm({ ...form, passportImage: "" });
                      }}
                      className="inp"
                    />
                    {form.passportImage && !passportFile && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Суулгасан зураг:{" "}
                        <a
                          href={form.passportImage}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary"
                        >
                          харах
                        </a>
                      </div>
                    )}
                    {passportFile && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Файл сонгогдсоно: {passportFile.name}
                      </div>
                    )}
                  </Field>
                  <Field label="🚛 Тээврийн хэрэгслийн гэрчилгээ">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setVehicleCertFile(f);
                        if (f) setForm({ ...form, vehicleCertImage: "" });
                      }}
                      className="inp"
                    />
                    {form.vehicleCertImage && !vehicleCertFile && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Суулгасан файл:{" "}
                        <a
                          href={form.vehicleCertImage}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary"
                        >
                          харах
                        </a>
                      </div>
                    )}
                    {vehicleCertFile && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Файл сонгогдсоно: {vehicleCertFile.name}
                      </div>
                    )}
                  </Field>
                  <Field label="🔗 Чиргүүлийн гэрчилгээ">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setTrailerCertFile(f);
                        if (f) setForm({ ...form, trailerCertImage: "" });
                      }}
                      className="inp"
                    />
                    {form.trailerCertImage && !trailerCertFile && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Суулгасан файл:{" "}
                        <a
                          href={form.trailerCertImage}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary"
                        >
                          харах
                        </a>
                      </div>
                    )}
                    {trailerCertFile && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Файл сонгогдсоно: {trailerCertFile.name}
                      </div>
                    )}
                  </Field>
                  <Field label="Дансны дугаар">
                    <input
                      value={form.accountNumber || ""}
                      onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                      className="inp"
                      placeholder="12345678"
                    />
                  </Field>

                  <Field label="Төрөл">
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value as "truck" | "wagon" })
                      }
                      className="inp"
                    >
                      <option value="truck">🚚 Машин</option>
                      <option value="wagon">🚆 Вагон</option>
                    </select>
                  </Field>
                </div>

                {/* Trailer plates */}
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Чиргүүлийн дугаар
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, trailerPlates: [...form.trailerPlates, ""] })
                      }
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
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            #{i + 1}
                          </span>
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

              <div className="flex items-center justify-end gap-2 border-t border-border p-3 sm:p-4">
                <button
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-border bg-card/60 px-3 py-2 text-sm sm:px-4"
                >
                  Болих
                </button>
                <button
                  onClick={handleSave}
                  disabled={creatingAccount}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:px-4"
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
      {/* Detail Modal */}
      <AnimatePresence>
        {detailDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetailDriver(null)}
            style={{ zIndex: 10000 }}
            className="fixed inset-0 flex items-center justify-center bg-background/70 p-4 backdrop-blur"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass flex w-full max-h-[90vh] max-w-2xl flex-col overflow-hidden rounded-2xl"
            >
              <div className="border-b border-border p-4 sm:p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Жолооч мэдээлэл
                </div>
                <h3 className="mt-1 truncate text-lg font-semibold">{detailDriver.name}</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <div className="flex gap-4">
                  <img
                    src={detailDriver.profileImage || "/profile-placeholder.png"}
                    alt="profile"
                    className="h-28 w-28 rounded-xl object-cover"
                  />
                  <div>
                    <div className="text-sm font-medium">{detailDriver.name}</div>
                    <div className="text-xs text-muted-foreground">Утас: {detailDriver.phone}</div>
                    <div className="text-xs text-muted-foreground">
                      Email: {detailDriver.email || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Үнэмлэх: {detailDriver.license}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Дугаар: {detailDriver.plateNumber}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Машин: {detailDriver.vehicleId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Даац: {detailDriver.capacity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Туршлага: {detailDriver.experience} жил
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Үнэлгээ: {detailDriver.rating}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Паспорын зураг
                    </div>
                    {detailDriver.passportImage ? (
                      <img
                        src={detailDriver.passportImage}
                        alt="passport"
                        className="w-full max-w-sm rounded"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">Байхгүй</div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Чиргүүлүүд
                    </div>
                    {detailDriver.trailerPlates.length > 0 ? (
                      <div className="text-sm">{detailDriver.trailerPlates.join(", ")}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Бүртгэгдээгүй</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      🚛 Тээврийн хэрэгслийн гэрчилгээ
                    </div>
                    {detailDriver.vehicleCertImage ? (
                      <img
                        src={detailDriver.vehicleCertImage}
                        alt="Тээврийн хэрэгслийн гэрчилгээ"
                        className="w-full max-w-sm rounded border border-border"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">Байхгүй</div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      🔗 Чиргүүлийн гэрчилгээ
                    </div>
                    {detailDriver.trailerCertImage ? (
                      <img
                        src={detailDriver.trailerCertImage}
                        alt="Чиргүүлийн гэрчилгээ"
                        className="w-full max-w-sm rounded border border-border"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">Байхгүй</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border p-3 sm:p-4">
                <button
                  onClick={() => setDetailDriver(null)}
                  className="rounded-lg border border-border bg-card/60 px-3 py-2 text-sm sm:px-4"
                >
                  Хаах
                </button>
                <button
                  onClick={() => detailDriver && downloadDriverPdf(detailDriver)}
                  className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary hover:bg-primary/25"
                >
                  PDF татах
                </button>
                <button
                  onClick={() => detailDriver && downloadJson(detailDriver)}
                  className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary hover:bg-primary/25"
                >
                  JSON татах
                </button>
                <button
                  onClick={() =>
                    downloadImage(detailDriver.profileImage, `${detailDriver.name}_profile.jpg`)
                  }
                  className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary hover:bg-primary/25"
                >
                  Профайл татах
                </button>
                <button
                  onClick={() =>
                    downloadImage(detailDriver.passportImage, `${detailDriver.name}_passport.jpg`)
                  }
                  className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary hover:bg-primary/25"
                >
                  Паспор татах
                </button>
                <button
                  onClick={() =>
                    downloadImage(
                      detailDriver.vehicleCertImage,
                      `${detailDriver.name}_vehicle_cert.jpg`,
                    )
                  }
                  className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary hover:bg-primary/25"
                >
                  🚛 Тээврийн гэрч. татах
                </button>
                <button
                  onClick={() =>
                    downloadImage(
                      detailDriver.trailerCertImage,
                      `${detailDriver.name}_trailer_cert.jpg`,
                    )
                  }
                  className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary hover:bg-primary/25"
                >
                  🔗 Чиргүүлийн гэрч. татах
                </button>
              </div>
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
