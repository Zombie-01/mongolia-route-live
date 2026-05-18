import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { motion } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, name, logout, authMode } = useStore();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

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

  return (
    <div className="flex h-screen flex-col">
      <header className="glass z-20 flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-6">
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
      <main className="relative flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
