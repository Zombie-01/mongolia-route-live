import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { motion } from "framer-motion";

interface AppShellProps {
  children: React.ReactNode;
  mobileView?: "map" | "list";
  onMobileViewChange?: (v: "map" | "list") => void;
}

export function AppShell({ children, mobileView, onMobileViewChange }: AppShellProps) {
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
            { to: "/track", label: "Ачаа хайх" },
          ];

  const showToggle = !!mobileView && !!onMobileViewChange;

  return (
    <div className="flex h-screen flex-col">
      <header className="glass z-20 flex items-center justify-between border-b border-border/60 px-4 py-2.5 md:px-5 md:py-3">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground glow md:h-8 md:w-8">
              <span className="text-sm md:text-base">S</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">
                ACHAA<span className="text-primary">.live</span>
              </div>
              <div className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
                Mongolia Fleet
              </div>
            </div>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  path === l.to
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs lg:flex"
          >
            <span className="relative inline-block h-2 w-2 rounded-full bg-primary pulse-ring" />
            <span className="text-muted-foreground">Шууд дамжуулалт</span>
          </motion.div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {name}
            {authMode === "mock" && (
              <span className="ml-1.5 rounded border border-warning/40 bg-warning/10 px-1 py-0.5 text-[9px] text-warning">
                MOCK
              </span>
            )}
          </span>
          <button
            onClick={() => {
              logout();
              nav({ to: "/" });
            }}
            className="rounded-md border border-border bg-card/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Гарах
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {children}
      </main>

      {/* Mobile bottom bar: view toggle + nav */}
      <div className="z-30 flex items-stretch border-t border-border bg-card/90 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* Nav links */}
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] transition-colors ${
              path === l.to ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="text-base leading-none">
              {l.to === "/dashboard" ? "S" : l.to === "/driver" ? "T" : "P"}
            </span>
            <span className="truncate">{l.label.split(" ")[0]}</span>
          </Link>
        ))}

        {/* Map/List toggle in bottom bar */}
        {showToggle && (
          <div className="flex border-l border-border">
            {(["map", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onMobileViewChange!(v)}
                className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2.5 text-[10px] transition-colors ${
                  mobileView === v
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <span className="text-base leading-none">{v === "map" ? "M" : "L"}</span>
                <span>{v === "map" ? "Зураг" : "Жагсаалт"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
