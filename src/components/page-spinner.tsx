import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Props = {
  /** Vertical padding scale (Tailwind py-{n}). Default 12. */
  py?: 12 | 16 | 20;
  /** Wrap in container with horizontal padding (for full-page states). */
  container?: boolean;
  className?: string;
};

const PY_CLASS: Record<number, string> = { 12: "py-12", 16: "py-16", 20: "py-20" };

export function PageSpinner({ py = 12, container = false, className }: Props) {
  return (
    <div
      className={cn(
        container ? "container mx-auto px-4" : "",
        "flex justify-center",
        PY_CLASS[py],
        className,
      )}
    >
      <Spinner className="size-8 text-muted-foreground" />
    </div>
  );
}
