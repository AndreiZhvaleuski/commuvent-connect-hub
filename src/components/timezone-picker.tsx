import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckIcon as Check, CaretUpDownIcon as ChevronsUpDown, MagnifyingGlassIcon as Search } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
};

type TzMeta = {
  id: string;          // IANA name e.g. "Europe/Berlin"
  city: string;        // "Berlin"
  region: string;      // "Europe"
  abbr: string;        // "CEST"
  offsetMin: number;   // 120
  offsetLabel: string; // "GMT+02:00"
  search: string;      // lowercase haystack
};

const ROW_HEIGHT = 44;
const LIST_HEIGHT = 320;

function getTzMeta(id: string, now: Date): TzMeta {
  let offsetMin = 0;
  let abbr = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: id,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    }).formatToParts(now);
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
    // Parse "GMT", "GMT+2", "GMT-5:30", "UTC"
    const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/i.exec(off);
    if (m) {
      const sign = m[1] === "-" ? -1 : 1;
      offsetMin = sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || "0", 10));
    }
  } catch { /* noop */ }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: id,
      timeZoneName: "short",
      hour: "2-digit",
    }).formatToParts(now);
    abbr = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch { /* noop */ }

  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offsetLabel = `GMT${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  const segs = id.split("/");
  const region = segs[0];
  const city = segs[segs.length - 1].replace(/_/g, " ");
  return {
    id, city, region, abbr, offsetMin, offsetLabel,
    search: `${id} ${city} ${region} ${abbr} ${offsetLabel} gmt${sign}${Math.floor(abs / 60)} utc${sign}${Math.floor(abs / 60)}`.toLowerCase(),
  };
}

function TimezonePickerImpl({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);

  const meta = useMemo(() => {
    const now = new Date();
    return options
      .map((id) => getTzMeta(id, now))
      .sort((a, b) => a.offsetMin - b.offsetMin || a.id.localeCompare(b.id));
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meta;
    // Allow "+2", "-5:30" style queries
    const normalized = q.replace(/\s+/g, "");
    return meta.filter((m) => m.search.includes(q) || m.offsetLabel.toLowerCase().includes(normalized));
  }, [meta, query]);

  useEffect(() => { setActive(0); }, [query]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      virtualizer.measure();
      const idx = filtered.findIndex((m) => m.id === value);
      if (idx >= 0) {
        setActive(idx);
        virtualizer.scrollToIndex(idx, { align: "center" });
      }
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const select = (tz: string) => {
    onChange(tz);
    setOpen(false);
    setQuery("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => {
        const n = Math.min(a + 1, filtered.length - 1);
        virtualizer.scrollToIndex(n);
        return n;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => {
        const n = Math.max(a - 1, 0);
        virtualizer.scrollToIndex(n);
        return n;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const tz = filtered[active];
      if (tz) select(tz.id);
    }
  };

  const selectedMeta = useMemo(() => meta.find((m) => m.id === value), [meta, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" role="combobox" className="w-full justify-between font-normal" />}>
        <span className="truncate">
          {selectedMeta ? (
            <>
              <span className="text-muted-foreground tabular-nums mr-2">({selectedMeta.offsetLabel})</span>
              {selectedMeta.id.replace(/_/g, " ")}
            </>
          ) : (
            "Pick a time zone"
          )}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[320px]" align="start">
        <div className="flex items-center gap-2 border-b px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search by city, region, GMT+2, CEST…"
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No match.</div>
        ) : (
          <div ref={parentRef} style={{ height: LIST_HEIGHT, overflow: "auto" }}>
            <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const m = filtered[vi.index];
                const isSelected = m.id === value;
                const isActive = vi.index === active;
                return (
                  <button
                    key={vi.key}
                    type="button"
                    onMouseEnter={() => setActive(vi.index)}
                    onClick={() => select(m.id)}
                    className={cn(
                      "absolute left-0 top-0 flex w-full items-center gap-3 px-3 text-left text-sm outline-none",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                    style={{ height: vi.size, transform: `translateY(${vi.start}px)` }}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="w-[72px] shrink-0 text-xs tabular-nums text-muted-foreground">{m.offsetLabel}</span>
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate">{m.city}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {m.region}{m.abbr && !/^GMT/i.test(m.abbr) ? ` · ${m.abbr}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const TimezonePicker = memo(TimezonePickerImpl);
