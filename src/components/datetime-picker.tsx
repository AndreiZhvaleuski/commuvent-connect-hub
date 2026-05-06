import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder?: string;
  minDate?: Date;
};

export function DateTimePicker({ value, onChange, placeholder = "Pick a date", minDate }: Props) {
  const [open, setOpen] = useState(false);
  const time = value ? format(value, "HH:mm") : "09:00";

  const setDatePart = (d: Date | undefined) => {
    if (!d) return;
    const [h, m] = time.split(":").map(Number);
    const next = new Date(d);
    next.setHours(h || 0, m || 0, 0, 0);
    onChange(next);
    setOpen(false);
  };

  const setTimePart = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(h || 0, m || 0, 0, 0);
    onChange(base);
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn("flex-1 justify-start text-left font-normal", !value && "text-muted-foreground")}
            />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "EEE, MMM d, yyyy") : <span>{placeholder}</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={setDatePart}
            disabled={minDate ? (d) => d < new Date(minDate.toDateString()) : undefined}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={time}
        onChange={(e) => setTimePart(e.target.value)}
        className="w-32"
      />
    </div>
  );
}
