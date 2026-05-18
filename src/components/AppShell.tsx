import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, name, logout, authMode } = useStore();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links =
    role === "driver"
      ? [{ to: "/driver", label: "Жолоочийн самбар" }]
      : role === "customer"
        ? [{ to: "/track", label: "Ачаа хайх" }]
        : [
            { to: "/dashboard", label: "Самбар" },
            { to: "/drivers", label: "Жолооч нар" },
            { to: "/stations", label: "Өртөө" },
            { to: "/track", label: "Ачаа хайх" },
          ];

  const handleNav = (to: string) => {
    setDrawerOpen(false);
    nav({ to });
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="glass z-20 flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Burger icon — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-[5px] md:hidden"
            aria-label="Цэс нээх"
          >
            <span className="block h-[2px] w-5 rounded-full bg-foreground transition-transform" />
            <span className="block h-[2px] w-5 rounded-full bg-foreground transition-transform" />
            <span className="block h-[2px] w-3.5 rounded-full bg-foreground transition-transform" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground glow">🛰</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">ACHAA<span className="text-primary">.live</span></div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Mongolia Fleet</div>
            </div>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  path === l.to ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs sm:flex"
          >
            <span className="relative inline-block h-2 w-2 rounded-full bg-primary text-primary pulse-ring" />
            <span className="text-muted-foreground">Шууд дамжуулалт идэвхтэй</span>
          </motion.div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {name}
            {authMode === "mock" && (
              <span className="ml-1.5 rounded border border-warning/40 bg-warning/10 px-1 py-0.5 text-[9px] text-warning">MOCK</span>
            )}
          </span>
          <button
            onClick={() => {
              logout();
              nav({ to: "/" });
            }}
            className="rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Гарах
          </button>
        </div>
      </header>
      <main className="relative flex-1 overflow-auto">{children}</main>

      {/* Mobile slide-out drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm md:hidden"
            />
            {/* Drawer panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background shadow-2xl md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground glow">🛰</div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold tracking-tight">ACHAA<span className="text-primary">.live</span></div>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card/60 text-muted-foreground hover:text-foreground"
                  aria-label="Цэс хаах"
                >
                  ✕
                </button>
              </div>

              {/* User info */}
              <div className="border-b border-border px-5 py-3">
                <div className="text-sm font-medium">{name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {role === "admin" ? "Админ" : role === "driver" ? "Жолооч" : "Харилцагч"}
                  {authMode === "mock" && (
                    <span className="ml-1.5 rounded border border-warning/40 bg-warning/10 px-1 py-0.5 text-[9px] text-warning">MOCK</span>
                  )}
                </div>
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto px-3 py-3">
                {links.map((l) => {
                  const active = path === l.to;
                  return (
                    <button
                      key={l.to}
                      onClick={() => handleNav(l.to)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                        active
                          ? "bg-primary/15 font-medium text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {l.to === "/dashboard" && "📊"}
                      {l.to === "/drivers" && "🚚"}
                      {l.to === "/stations" && "🏗"}
                      {l.to === "/track" && "🔍"}
                      {l.to === "/driver" && "🚛"}
                      {l.label}
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="border-t border-border p-4">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                    nav({ to: "/" });
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  🚪 Гарах
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
