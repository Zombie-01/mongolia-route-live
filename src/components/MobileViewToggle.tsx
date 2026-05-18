type View = "map" | "list";

export function MobileViewToggle({
  value,
  onChange,
}: {
  value: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1100] flex justify-center lg:hidden">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 text-xs shadow-lg backdrop-blur-md">
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              value === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "map" ? "🗺 Газрын зураг" : "📋 Жагсаалт"}
          </button>
        ))}
      </div>
    </div>
  );
}
