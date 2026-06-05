import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const { loginWithEmail, role, authMode } = useStore();
  const nav = useNavigate();

  // Email/password login state
  const [email, setEmail] = useState("admin@demo.mn");
  const [password, setPassword] = useState("demo1234");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  // Auto-navigate once a role is established
  useEffect(() => {
    if (!role) return;
    const to = role === "admin" ? "/dashboard" : role === "driver" ? "/driver" : "/track";
    nav({ to });
  }, [role, nav]);

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
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Шууд цагийн <span className="text-primary">ачаа тээврийн</span> хяналт
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Role cards removed - now using email/password login form */}
        </div>

        {/* Email/Password login form - Main interface */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-6 max-w-md"
        >
          <div className="rounded-2xl border border-border bg-card/60 p-8 backdrop-blur">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold">Нэвтрэх</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                И-мэйл болон нууц үгээ оруулна уу
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  И-мэйл
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailErr(null);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="admin@demo.mn"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Нууц үг
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setEmailErr(null);
                  }}
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

        {/* Quick fill seed accounts */}
        <div className="mt-8">
          <div className="mb-4 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Тестийн хаалтууд (товчлогоор сэлгих)
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              onClick={() => {
                setEmail("admin@demo.mn");
                setPassword("demo1234");
                setEmailErr(null);
              }}
              className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              👤 Админ
            </button>
            <button
              onClick={() => {
                setEmail("driver@demo.mn");
                setPassword("demo1234");
                setEmailErr(null);
              }}
              className="rounded-lg border border-blue-300/30 bg-blue-500/5 px-3 py-2.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
            >
              🚚 Жолооч
            </button>
            <button
              onClick={() => {
                setEmail("customer@demo.mn");
                setPassword("demo1234");
                setEmailErr(null);
              }}
              className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
            >
              📦 Харилцагч
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {emailLoading && (
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
