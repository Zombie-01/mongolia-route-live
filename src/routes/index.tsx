import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  const { login } = useStore();
  const nav = useNavigate();
  const [loading, setLoading] = useState<Role | null>(null);

  const handle = (r: Role, to: string) => {
    setLoading(r);
    login(r);
    setTimeout(() => nav({ to }), 900);
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      {/* ambient grid */}
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
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Шууд цагийн <span className="text-primary">ачаа тээврийн</span> хяналт
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Жолооч, диспетчер, харилцагч — нэг товшилтоор демо горимд орж бүх системийг туршина уу.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((r, i) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              whileHover={{ y: -4 }}
              onClick={() => handle(r.id, r.to)}
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
              <div className="mt-6 flex items-center gap-2 text-sm text-primary">
                Орох
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Нууц үг шаардлагагүй · Демо өгөгдөл автоматаар ачаалагдана
        </div>
      </motion.div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <div className="text-sm text-muted-foreground">Демо өгөгдөл ачаалж байна…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
