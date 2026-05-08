import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ListIcon as Menu } from "@phosphor-icons/react";
import logo from "@/assets/logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { userAvatarUrl } from "@/lib/avatar";
import { supabase } from "@/integrations/supabase/client";
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) return;

    supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile(data ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <img src={logo} alt="Commuvent" className="h-16 w-16 -my-4" width={64} height={64} />
          <span className="font-heading text-lg">Commuvent</span>
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
            (() => {
              const profileForUser = profile?.id === user.id ? profile : null;
              const meta = (user.user_metadata ?? {}) as { first_name?: string; last_name?: string; display_name?: string; avatar_url?: string };
              const first = meta.first_name?.trim() ?? "";
              const last = meta.last_name?.trim() ?? "";
              const fullName = [first, last].filter(Boolean).join(" ");
              const displayName = profileForUser?.display_name?.trim() || meta.display_name?.trim() || fullName || user.email?.split("@")[0] || "Account";
              const initials = displayName
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || (user.email?.[0] ?? "U").toUpperCase();
              const avatarUrl = userAvatarUrl({ id: user.id, avatar_url: profileForUser?.avatar_url || meta.avatar_url });
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label="Account menu"
                        className="flex items-center gap-2 rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                    }
                  >
                    <span className="hidden text-sm font-medium text-foreground sm:inline">{displayName}</span>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{fullName || displayName}</span>
                        <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()
          ) : (
            <Button size="sm" onClick={() => navigate("/sign-in")} className="hidden sm:inline-flex">Sign in</Button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" />}>
              <Menu className="h-5 w-5" />
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
