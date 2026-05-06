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

const ROW_HEIGHT = 36;
const LIST_HEIGHT = 320;

function TimezonePickerImpl({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => { setActive(0); }, [query]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  // When the popover opens, the scroll parent is measured as 0px on first render.
  // Re-measure once it's mounted so rows render immediately.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => virtualizer.measure());
    return () => cancelAnimationFrame(id);
  }, [open, virtualizer]);

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
      if (tz) select(tz);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" role="combobox" className="w-full justify-between font-normal" />}>
        {value || "Pick a time zone"}
        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
        <div className="flex items-center gap-2 border-b px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search time zones…"
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No match.</div>
        ) : (
          <div ref={parentRef} style={{ height: LIST_HEIGHT, overflow: "auto" }}>
            <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const tz = filtered[vi.index];
                const isSelected = tz === value;
                const isActive = vi.index === active;
                return (
                  <button
                    key={vi.key}
                    type="button"
                    onMouseEnter={() => setActive(vi.index)}
                    onClick={() => select(tz)}
                    className={cn(
                      "absolute left-0 top-0 flex w-full items-center px-3 text-left text-sm outline-none",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                    style={{ height: vi.size, transform: `translateY(${vi.start}px)` }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{tz}</span>
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

