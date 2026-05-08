import type { ReactNode } from "react";

export function StatBox({
  label,
  value,
  icon,
  suffix,
  highlight,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${highlight ? "border-primary" : ""}`}>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
