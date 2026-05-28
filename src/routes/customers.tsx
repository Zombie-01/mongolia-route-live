import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadUserInfoPdf } from "@/lib/user-info-pdf";
import { useStore, type Station } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

interface Customer {
  id: string;
  user_id?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  station_id?: string | null;
  created_at?: string;
}

const PAGE_SIZE = 10;

function CustomersPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { role, loading, createUserAccount, updateUserAccount, stations } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer>({ id: "", name: "" });
  const [accountPassword, setAccountPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [filterAccountStatus, setFilterAccountStatus] = useState<"all" | "active" | "inactive">(
    "all",
  );

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { customer: Customer; password?: string }) => {
      const c = data.customer;

      if (editing) {
        if (c.user_id) {
          const result = await updateUserAccount({
            userId: c.user_id,
            email: c.email || undefined,
            password: data.password || undefined,
          });
          if (result.error) throw new Error(result.error);
        }
        const { error } = await supabase
          .from("customers")
          .update({
            name: c.name,
            phone: c.phone,
            email: c.email,
            address: c.address,
            station_id: c.station_id,
          })
          .eq("id", c.id);
        if (error) throw error;
      } else {
        // Create auth account first
        if (!c.email || !data.password) {
          throw new Error("И-мэйл болон нууц үг оруулна уу");
        }
        if (data.password.length < 6) {
          throw new Error("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
        }

        const result = await createUserAccount({
          email: c.email,
          password: data.password,
          role: "customer",
          display_name: c.name,
          phone: c.phone ?? undefined,
        });

        if (result.error) throw new Error(result.error);

        // Insert customer record with user_id
        const { error } = await supabase.from("customers").insert([
          {
            name: c.name,
            phone: c.phone || null,
            email: c.email,
            address: c.address || null,
            station_id: c.station_id || null,
            user_id: result.user_id ?? null,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: async (_data, variables) => {
      if (!editing && variables.password) {
        // Fetch drivers to include in customer PDF
        let driverRows = [] as any[];
        try {
          const { data: drvData, error: drvErr } = await supabase
            .from("drivers")
            .select("*")
            .order("created_at", { ascending: false });
          if (!drvErr && drvData) driverRows = drvData as any[];
        } catch (e) {
          console.warn("Could not fetch drivers for PDF", e);
        }

        const baseLines = [
          { label: "Нэр", value: variables.customer.name },
          { label: "Утас", value: variables.customer.phone || "" },
          { label: "Email", value: variables.customer.email || "" },
          { label: "Password", value: variables.password },
          {
            label: "Өртөө",
            value: stations.find((s) => s.id === variables.customer.station_id)?.name || "",
          },
          { label: "Хаяг", value: variables.customer.address || "" },
        ];

        // Append drivers section
        const driverLines: any[] = [];
        if (driverRows.length > 0) {
          driverLines.push({ label: "\n\n—— Жолооч нар ——", value: "" });
          for (const d of driverRows) {
            driverLines.push({ label: `Жолооч: ${d.name || ""}`, value: d.name || "" });
            driverLines.push({ label: "Утас", value: d.phone || "" });
            driverLines.push({ label: "Лиценз", value: d.license || "" });
            driverLines.push({
              label: "Туршлага",
              value: d.experience ? `${d.experience} жил` : "",
            });
            driverLines.push({ label: "Плат", value: d.plate_number || "" });
            driverLines.push({ label: "ID", value: d.vehicle_id || "" });
            // images if available
            if (d.profile_photo_url)
              driverLines.push({
                label: "Профайл зураг",
                value: d.profile_photo_url,
                type: "image",
              });
            if (d.passport_photo_url)
              driverLines.push({
                label: "Passport зураг",
                value: d.passport_photo_url,
                type: "image",
              });
            if (d.vehicle_cert_url)
              driverLines.push({
                label: "Тээврийн гэрчилгээ",
                value: d.vehicle_cert_url,
                type: "image",
              });
            if (d.trailer_cert_url)
              driverLines.push({
                label: "Чиргүүлийн гэрчилгээ",
                value: d.trailer_cert_url,
                type: "image",
              });
            // small separator
            driverLines.push({ label: "", value: "" });
          }
        }

        try {
          await downloadUserInfoPdf({
            title: "Харилцагчийн нэвтрэх мэдээлэл",
            filename: `${variables.customer.name.replace(/\s+/g, "_") || variables.customer.id}_customer_info.pdf`,
            lines: [...baseLines, ...driverLines],
            notes:
              "Энэхүү PDF-д харилцагчийн системд нэвтрэх мэдээлэл болон холбоо барих мэдээлэл, систем дэхь жолооч нарын товч мэдээлэл багтсан болно.",
          });
        } catch (e) {
          console.warn("Failed to generate customer PDF", e);
        }

        setTimeout(() => {
          window.alert(
            `✅ Шинэ харилцагч амжилттай үүсгэгдлээ!\n\n` +
              `📋 Нэр: ${variables.customer.name}\n` +
              `📧 И-мэйл: ${variables.customer.email || "Байхгүй"}\n` +
              `🔑 Нууц үг: ${variables.password}\n` +
              `📞 Утас: ${variables.customer.phone || "Байхгүй"}\n` +
              `📍 Хаяг: ${variables.customer.address || "Байхгүй"}\n` +
              `🏢 Өртөө: ${stations.find((s) => s.id === variables.customer.station_id)?.name || "Байхгүй"}\n\n` +
              `📄 Мэдээллийн PDF файл татагдсан.`,
          );
        }, 500);
      }

      setFormOpen(false);
      setEditing(null);
      setForm({ id: "", name: "" });
      setAccountPassword("");
      setAccountError(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => {
      setAccountError(err.message);
      setCreatingAccount(false);
    },
  });

  const filteredCustomers = customers.filter((c) => {
    if (filterAccountStatus === "active") return !!c.user_id;
    if (filterAccountStatus === "inactive") return !c.user_id;
    return true;
  });

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
    else if (role !== "admin") nav({ to: "/driver" });
  }, [role, loading, nav]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < filteredCustomers.length) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredCustomers.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filteredCustomers.length]);

  const openNew = () => {
    setEditing(null);
    setForm({ id: "", name: "" });
    setAccountPassword("");
    setAccountError(null);
    setFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ ...c });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (accountPassword && accountPassword.length < 6) {
      setAccountError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }
    setCreatingAccount(true);
    setAccountError(null);
    saveMutation.mutate({ customer: form, password: accountPassword || undefined });
  };

  const visibleCustomers = filteredCustomers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCustomers.length;

  if (loading || role !== "admin") return null;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-6 pb-24">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Харилцагчид</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Харилцагч компани, хүмүүсийн мэдээлэл удирдлага
              </p>
            </div>
            <button
              onClick={openNew}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + Шинэ харилцагч
            </button>
          </div>

          {/* Active/Inactive filter */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilterAccountStatus("all")}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                filterAccountStatus === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Бүгд
            </button>
            <button
              type="button"
              onClick={() => setFilterAccountStatus("active")}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                filterAccountStatus === "active"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Бүртгэлтэй
            </button>
            <button
              type="button"
              onClick={() => setFilterAccountStatus("inactive")}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                filterAccountStatus === "inactive"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Бүртгэлгүй
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Ачаалж байна...</div>
            ) : visibleCustomers.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {filterAccountStatus !== "all"
                  ? "Шүүлтүүрт тохирох харилцагч олдсонгүй."
                  : 'Харилцагч бүртгэгдээгүй байна. "Шинэ харилцагч" товчийг дарж нэмнэ үү.'}
              </div>
            ) : (
              <>
                {visibleCustomers.map((c) => (
                  <motion.div key={c.id} layout className="glass rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold">{c.name}</span>
                          {c.user_id && (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                              Бүртгэлтэй
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                          {c.phone && <span>Утас: {c.phone}</span>}
                          {c.email && <span>Email: {c.email}</span>}
                          {c.station_id && (
                            <span>
                              Өртөө: {stations.find((s) => s.id === c.station_id)?.name || "?"}
                            </span>
                          )}
                          {c.address && <span>Байршил: {c.address}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs text-primary hover:bg-primary/25"
                        >
                          Засах
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`${c.name}-г устгах уу?`)) deleteMutation.mutate(c.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
                        >
                          Устгах
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <div ref={sentinelRef} />

                {hasMore && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={() =>
                        setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredCustomers.length))
                      }
                      className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Илүүг ачааллах ({filteredCustomers.length - visibleCount} үлдсэн)
                    </button>
                  </div>
                )}

                {!hasMore && filteredCustomers.length > PAGE_SIZE && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Бүх харилцагч харагдсан ({filteredCustomers.length})
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
              className="glass flex w-full max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-2xl"
            >
              <div className="border-b border-border p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {editing ? "Харилцагч засах" : "Шинэ харилцагч"}
                </div>
                <h3 className="mt-1 text-lg font-semibold">{form.name || "Шинэ харилцагч"}</h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {/* Auth account section */}
                {editing ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      Нууц үг өөрчлөх
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      Хэрэв хэрэглэгчийн нууц үгийг өөрчлөх шаардлагатай бол доорх талбарыг бөглөнө.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Шинэ нууц үг">
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
                ) : (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      Нэвтрэх бүртгэл үүсгэх
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      Харилцагч системд нэвтрэхийн тулд и-мэйл болон нууц үг оруулна уу. Энэ
                      бүртгэлээр ачаагаа хянах боломжтой.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                <Field label="Компани / Хүний нэр">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="inp"
                    placeholder="Компаны нэр эсвэл хүний нэр"
                  />
                </Field>
                <Field label="Утас">
                  <input
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="inp"
                    placeholder="+976 ..."
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="inp"
                    placeholder="example@company.mn"
                  />
                </Field>
                <Field label="Өртөө">
                  <div className="flex gap-2">
                    <select
                      value={form.station_id || ""}
                      onChange={(e) => setForm({ ...form, station_id: e.target.value || null })}
                      className="inp"
                    >
                      <option value="">-- Өртөө сонгох --</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <NewStationButton
                      onCreated={(newStationId) => setForm({ ...form, station_id: newStationId })}
                    />
                  </div>
                </Field>
                <Field label="Хаяг">
                  <textarea
                    value={form.address || ""}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="inp resize-none"
                    rows={2}
                    placeholder="Компаны хаяг"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border p-4">
                <button
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm"
                >
                  Болих
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Хадгалж байна..." : editing ? "Хадгалах" : "Нэмэх"}
                </button>
              </div>

              <style>{`
                .inp { width: 100%; background: var(--card); color: var(--foreground); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13px; outline: none; font-family: inherit; }
                .inp:focus { border-color: var(--primary); box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 30%, transparent); }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function NewStationButton({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addStationLocal } = useStore();

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Өртөөний нэр оруулна уу");
      return;
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Зөв координат (lat, lng) оруулна уу");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("stations")
        .insert({
          name: name.trim(),
          latitude,
          longitude,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      if (data?.id) {
        const newStation: Station = {
          id: data.id,
          name: name.trim(),
          city: "",
          position: [latitude, longitude],
          type: "station",
          contact: "",
          active: true,
        };
        addStationLocal(newStation);
        onCreated(data.id);
        setOpen(false);
        setName("");
        setLat("");
        setLng("");
      }
    } catch (err: any) {
      setError(err.message || "Өртөө үүсгэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="whitespace-nowrap rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-xs text-primary hover:bg-primary/10"
        >
          + Шинэ
        </button>
      ) : (
        <div className="absolute right-0 top-0 z-50 w-72 rounded-xl border border-border bg-card p-4 shadow-xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Шинэ өртөө нэмэх
          </div>
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="inp text-xs"
              placeholder="Өртөөний нэр"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="inp text-xs"
                placeholder="Lat (ө.өр)"
                type="number"
                step="any"
              />
              <input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="inp text-xs"
                placeholder="Lng (ур.өр)"
                type="number"
                step="any"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="flex-1 rounded-lg border border-border bg-card/60 px-2 py-1.5 text-xs text-muted-foreground"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Үүсгэж байна..." : "Үүсгэх"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
