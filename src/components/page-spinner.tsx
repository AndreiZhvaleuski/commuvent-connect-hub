import { Spinner } from "@/components/ui/spinner";

export function PageSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Spinner className="size-8 text-muted-foreground" />
    </div>
  );
}
