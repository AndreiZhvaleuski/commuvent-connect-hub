import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  count?: number;
  className?: string;
  itemHeightClass?: string;
};

export function SkeletonGrid({
  count = 6,
  className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  itemHeightClass = "h-48",
}: Props) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className={cn(itemHeightClass)} />
        </Card>
      ))}
    </div>
  );
}
