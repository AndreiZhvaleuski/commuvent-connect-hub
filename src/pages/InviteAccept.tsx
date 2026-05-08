import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Role = "host" | "checker";
type Preview = {
  host_id: string;
  host_name: string;
  host_logo_url: string | null;
  host_bio: string | null;
  role: Role;
  expires_at: string;
};

const ROLE_DESC: Record<Role, string> = {
  host: "Hosts can create and manage events, approve gallery uploads, view dashboards, and export CSVs.",
  checker: "Checkers can access the check-in page for events under this host.",
};

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [existingRole, setExistingRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token || loading) return;
    if (!user) return;
    (async () => {
      setBusy(true);
      const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token });
      if (error) {
        setError(error.message);
      } else if (!data || (data as any[]).length === 0) {
        setError("This invite is invalid or has expired.");
      } else {
        const p = (data as any[])[0] as Preview;
        setPreview(p);
        const { data: hm } = await supabase
          .from("host_members")
          .select("role")
          .eq("host_id", p.host_id)
          .eq("user_id", user.id)
          .maybeSingle();
        setExistingRole((hm?.role as Role | undefined) ?? null);
      }
      setBusy(false);
    })();
  }, [token, user, loading]);

  if (!loading && !user) {
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(`/invite/${token}`)}`} replace />;
  }

  async function accept() {
    if (!token || !preview) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_host_invite", { p_token: token });
    setAccepting(false);
    if (error) return toast.error(error.message);
    toast.success("Invitation accepted");
    navigate(`/dashboard/${data as string}`);
  }

  const sameRole = existingRole && preview && existingRole === preview.role;
  const differentRole = existingRole && preview && existingRole !== preview.role;

  return (
    <><div className="container mx-auto max-w-md px-4 py-20">
        <Card>
          <CardHeader><CardTitle>Host invitation</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {busy ? (
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            ) : error || !preview ? (
              <>
                <p className="text-sm text-muted-foreground">{error ?? "Invite not found."}</p>
                <Button render={<Link to="/" />} variant="outline">Go home</Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {preview.host_logo_url && <AvatarImage src={preview.host_logo_url} alt={preview.host_name} />}
                    <AvatarFallback>{preview.host_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{preview.host_name}</div>
                    <Link
                      to={`/h/${preview.host_id}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      View public page <ArrowSquareOutIcon className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {preview.host_bio && (
                  <p className="text-sm text-muted-foreground">{preview.host_bio}</p>
                )}

                {sameRole ? (
                  <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                    <p className="text-sm">
                      You're already a{" "}
                      <Badge variant={preview.role === "host" ? "default" : "secondary"} className="capitalize">{preview.role}</Badge>{" "}
                      of this host — no action needed.
                    </p>
                    <Button render={<Link to={`/dashboard/${preview.host_id}`} />} className="w-full">
                      Go to dashboard
                    </Button>
                  </div>
                ) : differentRole ? (
                  <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                    <p className="text-sm">
                      You're already a{" "}
                      <Badge variant={existingRole === "host" ? "default" : "secondary"} className="capitalize">{existingRole}</Badge>{" "}
                      of this host. Accepting this invite will change your role to{" "}
                      <Badge variant={preview.role === "host" ? "default" : "secondary"} className="capitalize">{preview.role}</Badge>.
                    </p>
                    <p className="text-xs text-muted-foreground">{ROLE_DESC[preview.role]}</p>
                    <div className="flex gap-2">
                      <Button onClick={accept} disabled={accepting} className="flex-1">
                        {accepting ? "Updating…" : `Switch to ${preview.role}`}
                      </Button>
                      <Button render={<Link to={`/dashboard/${preview.host_id}`} />} variant="outline">
                        Keep current role
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">
                      You've been invited to join as a{" "}
                      <Badge variant={preview.role === "host" ? "default" : "secondary"} className="capitalize">{preview.role}</Badge>.
                    </p>
                    <p className="text-xs text-muted-foreground">{ROLE_DESC[preview.role]}</p>
                    <Button onClick={accept} disabled={accepting} className="w-full">
                      {accepting ? "Accepting…" : "Accept invitation"}
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
