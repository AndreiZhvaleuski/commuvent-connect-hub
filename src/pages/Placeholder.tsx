import { type ReactNode } from "react";
import { AppLayout } from "@/components/app-layout";
export function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-muted-foreground">Coming up next. This page will be built in step 4+.</p>
        {children}
      </div>
    </AppLayout>
  );
}
