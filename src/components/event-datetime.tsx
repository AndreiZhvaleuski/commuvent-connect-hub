import { CalendarIcon, GlobeIcon, HourglassIcon } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getEventTimeInfo } from "@/lib/event-time";
import { cn } from "@/lib/utils";

type Props = {
  startIso: string;
  endIso: string;
  timeZone: string | null | undefined;
  variant?: "full" | "compact";
  className?: string;
};

export function EventDateTime({ startIso, endIso, timeZone, variant = "compact", className }: Props) {
  const info = getEventTimeInfo(startIso, endIso, timeZone);

  if (variant === "full") {
    return (
      <div className={cn("space-y-1 text-xs text-muted-foreground", className)}>
        <p className="flex items-start gap-1.5">
          <CalendarIcon className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            {info.rangeEvent}
            {!info.sameTz && (
              <>
                <span className="hidden sm:inline"> </span>
                <span className="block opacity-70 sm:inline">({info.eventTz})</span>
              </>
            )}
          </span>
        </p>
        {!info.sameTz && (
          <p className="flex items-start gap-1.5">
            <GlobeIcon className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              {info.rangeUser}
              <span className="hidden sm:inline"> </span>
              <span className="block opacity-70 sm:inline">(your time · {info.userTz})</span>
            </span>
          </p>
        )}
        {info.duration && (
          <p className="flex items-start gap-1.5">
            <HourglassIcon className="h-3 w-3 shrink-0 mt-0.5" />
            <span>Duration: {info.duration}</span>
          </p>
        )}
      </div>
    );
  }

  const compactText = `${info.rangeEvent}${info.duration ? ` · ${info.duration}` : ""}`;
  const tip = info.sameTz
    ? null
    : `${info.rangeUser} (your time · ${info.userTz})`;

  const node = (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <CalendarIcon className="h-4 w-4 shrink-0" />
      <span className="truncate">{compactText}</span>
    </span>
  );

  if (!tip) return node;
  return (
    <Tooltip>
      <TooltipTrigger render={node} />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
