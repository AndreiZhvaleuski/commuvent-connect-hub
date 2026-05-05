import { Link, NavLink, useNavigate } from "react-router-dom";
import { UsersIcon as Users, ListIcon as Menu } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { to: "/explore", label: "Explore" },
  { to: "/tickets", label: "My Tickets" },
  { to: "/my-events", label: "My Events" },
  { to: "/dashboard", label: "Dashboard" },
];

export function TopNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Users className="h-4 w-4" />
          </span>
          <span className="text-lg">Commuvent</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${isActive ? "text-foreground" : "text-muted-foreground"}`
              }>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">{user.email?.split("@")[0] ?? "Account"}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/tickets")}>My Tickets</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/my-events")}>My Events</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>Dashboard</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => navigate("/sign-in")} className="hidden sm:inline-flex">Sign in</Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="gap-0">
              <SheetHeader>
                <SheetTitle className="font-heading">Commuvent</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 py-2">
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                        isActive ? "bg-accent text-foreground" : "text-muted-foreground"
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
              {!user && (
                <div className="mt-auto border-t p-4">
                  <Button size="sm" className="w-full" onClick={() => navigate("/sign-in")}>
                    Sign in
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
