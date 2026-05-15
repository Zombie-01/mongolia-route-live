import { motion, AnimatePresence } from "framer-motion";
import type { Shipment } from "@/lib/demo-data";

const statusLabel: Record<Shipment["status"], string> = {
  in_transit: "Замд",
  stopped: "Зогссон",
  delayed: "Хоцрол",
  delivered: "Хүргэгдсэн",
};

const countryLabel: Record<string, string> = {
  MN: "🇲🇳 Монгол",
  RU: "🇷🇺 ОХУ",
  CN: "🇨🇳 БНХАУ",
};

interface Props {
  shipment: Shipment | null;
  onClose: () => void;
}

export function ShipmentDetailModal({ shipment, onClose }: Props) {
  return (
    <AnimatePresence>
      {shipment && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur"
        >
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-lg overflow-hidden rounded-2xl"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <span>{shipment.trackingId}</span>
                  <span>·</span>
                  <span>{shipment.type === "wagon" ? "🚆 Вагон" : "🚚 Ачааны машин"}</span>
                </div>
                <h3 className="mt-1 text-xl font-semibold">{shipment.cargo}</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Илгээх улс" value={countryLabel[shipment.country ?? "MN"]} />
                <Field label="Төлөв" value={statusLabel[shipment.status]} />
                <Field label="Эхлэл" value={shipment.origin} />
                <Field label="Хүрэх газар" value={shipment.destination} />
                <Field label="Жолооч / Бригад" value={shipment.driver} />
                <Field label="Машин / Вагон" value={shipment.vehicleId} />
                <Field label="Хурд" value={`${shipment.speed} км/ц`} />
                <Field label="ETA" value={shipment.eta} />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Замналын явц</span>
                  <span className="tabular-nums">{Math.round(shipment.progress * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    animate={{ width: `${Math.round(shipment.progress * 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">Сүүлийн GPS</div>
                <div className="font-mono tabular-nums">
                  {shipment.position[0].toFixed(4)}°N, {shipment.position[1].toFixed(4)}°E
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
