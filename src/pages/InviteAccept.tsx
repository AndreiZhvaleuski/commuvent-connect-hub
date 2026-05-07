import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Preview = { host_id: string; host_name: string; role: "host" | "checker"; expires_at: string };

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token });
      if (error) setError(error.message);
      else if (!data || (data as any[]).length === 0) setError("This invite is invalid or has expired.");
      else setPreview((data as any[])[0] as Preview);
      setBusy(false);
    })();
  }, [token]);

  if (!loading && !user) {
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(`/invite/${token}`)}`} replace />;
  }

  async function accept() {
    if (!token) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_host_invite", { p_token: token });
    setAccepting(false);
    if (error) return toast.error(error.message);
    toast.success("Invitation accepted");
    navigate(`/dashboard/${data as string}`);
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-md px-4 py-20">
        <Card>
          <CardHeader><CardTitle>Host invitation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {busy ? (
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            ) : error || !preview ? (
              <>
                <p className="text-sm text-muted-foreground">{error ?? "Invite not found."}</p>
                <Button render={<Link to="/" />} variant="outline">Go home</Button>
              </>
            ) : (
              <>
                <p className="text-sm">
                  You've been invited to join <strong>{preview.host_name}</strong> as a{" "}
                  <Badge variant={preview.role === "host" ? "default" : "secondary"} className="capitalize">{preview.role}</Badge>.
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.role === "host"
                    ? "Hosts can create and manage events, approve gallery uploads, view dashboards, and export CSVs."
                    : "Checkers can access the check-in page for events under this host."}
                </p>
                <Button onClick={accept} disabled={accepting} className="w-full">
                  {accepting ? "Accepting…" : "Accept invitation"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
