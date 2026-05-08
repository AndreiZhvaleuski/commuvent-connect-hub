import { type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "./top-nav";
import { Footer } from "./footer";

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNav />
      <main className="flex-1">{children ?? <Outlet />}</main>
      <Footer />
    </div>
  );
}
