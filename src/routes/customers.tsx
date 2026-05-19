import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
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
  created_at?: string;
}

const PAGE_SIZE = 10;

function CustomersPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { role, loading, createUserAccount } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer>({ id: "", name: "" });
  const [accountPassword, setAccountPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
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
        const { error } = await supabase
          .from("customers")
          .update({ name: c.name, phone: c.phone, email: c.email, address: c.address })
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
            user_id: result.user_id ?? null,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
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

  useEffect(() => {
    if (loading) return;
    if (!role) nav({ to: "/" });
    else if (role !== "admin") nav({ to: "/driver" });
  }, [role, loading, nav]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < customers.length) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, customers.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, customers.length]);

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
    setCreatingAccount(true);
    setAccountError(null);
    saveMutation.mutate({ customer: form, password: editing ? undefined : accountPassword });
  };

  const visibleCustomers = customers.slice(0, visibleCount);
  const hasMore = visibleCount < customers.length;

  if (loading || role !== "admin") return null;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-6 pb-24">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Харилцагчид</h1>
              <p className="mt-1 text-sm text-muted-foreground">Харилцагч компани, хүмүүсийн мэдээлэл удирдлага</p>
            </div>
            <button
              onClick={openNew}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + Шинэ харилцагч
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Ачаалж байна...</div>
            ) : visibleCustomers.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Харилцагч бүртгэгдээгүй байна. "Шинэ харилцагч" товчийг дарж нэмнэ үү.
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
                      onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, customers.length))}
                      className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Илүүг ачааллах ({customers.length - visibleCount} үлдсэн)
                    </button>
                  </div>
                )}

                {!hasMore && customers.length > PAGE_SIZE && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Бүх харилцагч харагдсан ({customers.length})
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
              className="glass flex w-full max-w-lg flex-col overflow-hidden rounded-2xl"
            >
              <div className="border-b border-border p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {editing ? "Харилцагч засах" : "Шинэ харилцагч"}
                </div>
                <h3 className="mt-1 text-lg font-semibold">{form.name || "Шинэ харилцагч"}</h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {/* Auth account section — only for new customers */}
                {!editing && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      Нэвтрэх бүртгэл үүсгэх
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      Харилцагч системд нэвтрэхийн тулд и-мэйл болон нууц үг оруулна уу. Энэ бүртгэлээр ачаагаа хянах боломжтой.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <Field label="Хаяг">
                  <textarea
                    value={form.address || ""}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="inp resize-none"
                    rows={3}
                    placeholder="Компаны хаяг"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border p-4">
                <button onClick={() => setFormOpen(false)} className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
