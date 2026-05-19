import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

type Role = "admin" | "driver" | "customer";

const roles: { id: Role; label: string; emoji: string; desc: string; to: string }[] = [
  { id: "admin", label: "Админ демо", emoji: "🛰", desc: "Бүх флотыг шууд хяна", to: "/dashboard" },
  { id: "driver", label: "Жолооч демо", emoji: "🚚", desc: "GPS байршил дамжуул", to: "/driver" },
  { id: "customer", label: "Харилцагч демо", emoji: "📦", desc: "Ачаагаа шууд хяна", to: "/track" },
];

function LoginPage() {
  const { loginDemo, loginWithEmail, role, authMode } = useStore();
  const nav = useNavigate();
  const [loading, setLoading] = useState<Role | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Email/password login state
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  // Auto-navigate once a role is established
  useEffect(() => {
    if (!role) return;
    const to = role === "admin" ? "/dashboard" : role === "driver" ? "/driver" : "/track";
    nav({ to });
  }, [role, nav]);

  const handle = async (r: Role) => {
    setErr(null);
    setLoading(r);
    const { error } = await loginDemo(r);
    if (error) {
      setErr(error);
      setLoading(null);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setEmailErr("И-мэйл болон нууц үг оруулна уу");
      return;
    }
    setEmailErr(null);
    setEmailLoading(true);
    const { error } = await loginWithEmail(email, password);
    if (error) {
      setEmailErr(error);
      setEmailLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Demo MVP · Mongolia · OpenStreetMap
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Шууд цагийн <span className="text-primary">ачаа тээврийн</span> хяналт
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Жолооч, диспетчер, харилцагч — нэг товшилтоор бодит хэрэглэгчээр нэвтэрч системийг туршина уу.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {roles.map((r, i) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              whileHover={{ y: -4 }}
              onClick={() => handle(r.id)}
              disabled={loading !== null}
              className="glass group relative overflow-hidden rounded-2xl p-6 text-left transition-shadow hover:glow disabled:opacity-60"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl">{r.emoji}</div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  1-click
                </span>
              </div>
              <div className="text-lg font-semibold">{r.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{r.desc}</div>
              <div className="mt-4 font-mono text-[10px] text-muted-foreground">
                {r.id}@demo.mn · demo1234
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                {loading === r.id ? "Нэвтэрч байна…" : "Орох"}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </motion.button>
          ))}
        </div>

        {err && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-center text-xs text-destructive">
            {err}
          </div>
        )}

        {/* Email/Password login section */}
        <div className="mt-8">
          <button
            onClick={() => setShowEmailLogin(!showEmailLogin)}
            className="mx-auto flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="h-px flex-1 bg-border" />
            <span className="shrink-0 px-4">Эсвэл и-мэйлээр нэвтрэх</span>
            <span className="h-px flex-1 bg-border" />
          </button>

          <AnimatePresence>
            {showEmailLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
                  <div className="mb-4 text-center text-sm font-medium">И-мэйлээр нэвтрэх</div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">И-мэйл</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailErr(null); }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="driver@company.mn"
                        onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Нууц үг</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setEmailErr(null); }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="••••••"
                        onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                      />
                    </div>
                    {emailErr && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {emailErr}
                      </div>
                    )}
                    <button
                      onClick={handleEmailLogin}
                      disabled={emailLoading}
                      className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {emailLoading ? "Нэвтэрч байна..." : "Нэвтрэх"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          {authMode === "supabase"
            ? "Supabase Cloud-р нэвтэрсэн · Бодит хэрэглэгчид"
            : "Demo горим · Supabase Cloud холбогдоогүй тул mock нэвтрэлт ашиглаж байна"}
        </div>
      </motion.div>

      <AnimatePresence>
        {(loading || emailLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <div className="text-sm text-muted-foreground">Нэвтэрч байна…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
