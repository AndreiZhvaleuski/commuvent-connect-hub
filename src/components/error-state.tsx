import { type ReactNode } from "react";
import { WarningCircleIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
  className,
}: Props) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <WarningCircleIcon className="h-8 w-8 text-destructive" />
        <p className="text-base font-medium">{title}</p>
        {description && (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        )}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            <ArrowClockwiseIcon className="mr-1 h-4 w-4" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
