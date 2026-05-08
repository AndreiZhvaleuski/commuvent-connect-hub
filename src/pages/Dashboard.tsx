import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusIcon as Plus, UsersIcon as Users } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Host = { id: string; name: string; logo_url: string | null; bio: string | null; role: "host" | "checker" };

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent("/dashboard")}`); return; }
    (async () => {
      const { data: members } = await supabase
        .from("host_members")
        .select("host_id, role")
        .eq("user_id", user.id);
      const ids = (members ?? []).map((m) => m.host_id);
      if (ids.length === 0) { setHosts([]); setBusy(false); return; }
      const roleMap = new Map<string, "host" | "checker">((members ?? []).map((m) => [m.host_id, m.role as "host" | "checker"]));
      const { data } = await supabase
        .from("hosts")
        .select("id,name,logo_url,bio")
        .in("id", ids);
      setHosts(((data ?? []) as Omit<Host, "role">[]).map((h) => ({ ...h, role: roleMap.get(h.id) ?? "checker" })));
      setBusy(false);
    })();
  }, [user, loading, navigate]);

  return (
    <><div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your hosts</h1>
            <p className="text-muted-foreground mt-1">Pick a host to manage its events.</p>
          </div>
          <Button render={<Link to="/become-a-host" />}><Plus className="mr-1 h-4 w-4" />New host</Button>
        </div>

        {busy ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>)}
          </div>
        ) : hosts.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No hosts yet"
            description="Create one to start publishing events."
            action={<Button render={<Link to="/become-a-host" />}>Become a host</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {hosts.map((h) => (
              <Link key={h.id} to={`/dashboard/${h.id}`}>
                <Card className="h-full transition hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader className="flex-row items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {h.logo_url && <AvatarImage src={h.logo_url} alt={h.name} />}
                      <AvatarFallback>{h.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{h.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{h.role === "checker" ? "Checker · Check-in events" : "Manage events"}</p>
                    </div>
                  </CardHeader>
                  {h.bio && <CardContent className="text-sm text-muted-foreground line-clamp-2">{stripMarkdown(h.bio)}</CardContent>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
