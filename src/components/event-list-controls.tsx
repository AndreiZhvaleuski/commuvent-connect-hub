import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EventView = "upcoming" | "past";
export type EventSortDir = "asc" | "desc";

type Props = {
  view: EventView;
  onViewChange: (v: EventView) => void;
  sortDir: EventSortDir;
  onSortChange: (s: EventSortDir) => void;
  upcomingCount: number;
  pastCount: number;
};

export function EventListControls({
  view,
  onViewChange,
  sortDir,
  onSortChange,
  upcomingCount,
  pastCount,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={view} onValueChange={(v) => onViewChange(v as EventView)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
        </TabsList>
      </Tabs>
      <Tabs value={sortDir} onValueChange={(v) => onSortChange(v as EventSortDir)}>
        <TabsList>
          <TabsTrigger value="asc">Earliest first</TabsTrigger>
          <TabsTrigger value="desc">Latest first</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
