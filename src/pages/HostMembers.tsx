import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, CopyIcon, TrashIcon, PlusIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";

type Role = "host" | "checker";
type Host = { id: string; name: string; logo_url: string | null };
type Member = { user_id: string; role: Role; created_at: string; profile: { display_name: string | null; avatar_url: string | null; email: string | null } | null };
type Invite = { id: string; role: Role; token: string; expires_at: string; created_at: string };

const ROLE_DESC: Record<Role, string> = {
  host: "Full management: create and manage events, approve gallery uploads, view dashboards, export CSVs.",
  checker: "Limited to the check-in page for events under this host.",
};

export default function HostMembers() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [host, setHost] = useState<Host | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(true);
  const [generating, setGenerating] = useState<Role | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const myRole = useMemo(() => members.find((m) => m.user_id === user?.id)?.role ?? null, [members, user?.id]);
  const isHost = myRole === "host";
  const hostCount = useMemo(() => members.filter((m) => m.role === "host").length, [members]);

  async function refresh() {
    if (!hostId) return;
    const [{ data: h }, { data: hm }, { data: inv }] = await Promise.all([
      supabase.from("hosts").select("id,name,logo_url").eq("id", hostId).maybeSingle(),
      supabase.from("host_members").select("user_id,role,created_at").eq("host_id", hostId),
      supabase.from("host_invites").select("id,role,token,expires_at,created_at").eq("host_id", hostId).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    ]);
    setHost((h ?? null) as Host | null);
    const userIds = (hm ?? []).map((m: any) => m.user_id);
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url,email").in("id", userIds);
      profiles = profs ?? [];
    }
    setMembers(((hm ?? []) as any[]).map((m) => ({
      ...m,
      profile: profiles.find((p) => p.id === m.user_id) ?? null,
    })) as Member[]);
    setInvites((inv ?? []) as Invite[]);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent(`/dashboard/${hostId}/members`)}`); return; }
    if (!hostId) return;
    (async () => { setBusy(true); await refresh(); setBusy(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostId, user, loading]);

  async function generateInvite(role: Role) {
    if (!hostId) return;
    setGenerating(role);
    try {
      let lastErr: any = null;
      for (let i = 0; i < 3; i++) {
        const token = crypto.randomUUID().replace(/-/g, "");
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from("host_invites").insert({ host_id: hostId, role, token, expires_at, created_by: user!.id });
        if (!error) { lastErr = null; break; }
        lastErr = error;
        if (!String(error.message).toLowerCase().includes("duplicate")) break;
      }
      if (lastErr) throw lastErr;
      await refresh();
      toast.success("Invite link created");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create invite");
    } finally {
      setGenerating(null);
    }
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from("host_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setInvites((prev) => prev.filter((i) => i.id !== id));
    toast.success("Invite revoked");
  }

  async function changeRole(userId: string, nextRole: Role) {
    const m = members.find((x) => x.user_id === userId);
    if (!m) return;
    if (m.role === "host" && nextRole === "checker" && hostCount <= 1) {
      return toast.error("At least one Host is required");
    }
    const { error } = await supabase.from("host_members").update({ role: nextRole }).eq("host_id", hostId!).eq("user_id", userId);
    if (error) return toast.error(error.message);
    setMembers((prev) => prev.map((x) => (x.user_id === userId ? { ...x, role: nextRole } : x)));
    toast.success("Role updated");
  }

  async function removeMember(userId: string) {
    const m = members.find((x) => x.user_id === userId);
    if (!m) return;
    if (m.role === "host" && hostCount <= 1) {
      return toast.error("Cannot remove the last Host");
    }
    const { error } = await supabase.from("host_members").delete().eq("host_id", hostId!).eq("user_id", userId);
    if (error) return toast.error(error.message);
    if (userId === user?.id) {
      toast.success("You left this host");
      navigate("/dashboard");
      return;
    }
    setMembers((prev) => prev.filter((x) => x.user_id !== userId));
    toast.success("Member removed");
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  if (busy) {
    return <AppLayout><div className="container mx-auto px-4 py-12"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div></AppLayout>;
  }
  if (!host) {
    return <AppLayout><div className="container mx-auto px-4 py-12"><p>Host not found.</p></div></AppLayout>;
  }
  if (!myRole) {
    return <AppLayout><div className="container mx-auto px-4 py-12"><p>You are not a member of this host.</p></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Link to={`/dashboard/${host.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="mb-8 flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {host.logo_url && <AvatarImage src={host.logo_url} alt={host.name} />}
            <AvatarFallback>{host.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{host.name}</h1>
            <p className="text-sm text-muted-foreground">Members & invitations</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => {
              const isMe = m.user_id === user?.id;
              const isLastHost = m.role === "host" && hostCount <= 1;
              return (
                <div key={m.user_id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                  <Avatar className="h-9 w-9">
                    {m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} />}
                    <AvatarFallback>{(m.profile?.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{m.profile?.display_name ?? "Unnamed"}</span>
                      {isMe && <Badge variant="outline">You</Badge>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.profile?.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Joined {format(new Date(m.created_at), "MMM d, yyyy")}</div>
                  </div>
                  {isHost ? (
                    <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v as Role)} disabled={isLastHost && m.role === "host"}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="host">Host</SelectItem>
                        <SelectItem value="checker">Checker</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={m.role === "host" ? "default" : "secondary"} className="capitalize">{m.role}</Badge>
                  )}
                  {(isHost || isMe) && (
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button variant="ghost" size="icon" disabled={isLastHost} aria-label="Remove member">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      } />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{isMe ? "Leave this host?" : "Remove member?"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isMe ? "You will lose access to this host's management." : `${m.profile?.display_name ?? "This member"} will lose access to this host.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember(m.user_id)}>{isMe ? "Leave" : "Remove"}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {isHost && (
          <Card>
            <CardHeader>
              <CardTitle>Invite by link</CardTitle>
              <p className="text-sm text-muted-foreground">Generate a link and share it with the person you want to invite. Links expire in 7 days.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {(["host", "checker"] as Role[]).map((role) => (
                  <div key={role} className="rounded-md border p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-medium capitalize">{role}</h3>
                      <Badge variant={role === "host" ? "default" : "secondary"} className="capitalize">{role}</Badge>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">{ROLE_DESC[role]}</p>
                    <Button size="sm" onClick={() => generateInvite(role)} disabled={generating === role}>
                      <PlusIcon className="mr-1 h-4 w-4" />
                      {generating === role ? "Creating…" : `Create ${role} link`}
                    </Button>
                  </div>
                ))}
              </div>

              {invites.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Active invite links</h3>
                  {invites.map((inv) => {
                    const url = `${window.location.origin}/invite/${inv.token}`;
                    return (
                      <div key={inv.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={inv.role === "host" ? "default" : "secondary"} className="capitalize">{inv.role}</Badge>
                            <span className="text-xs text-muted-foreground">expires {format(new Date(inv.expires_at), "MMM d")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>
                              <CopyIcon className="mr-1 h-4 w-4" />Copy
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => revokeInvite(inv.id)} aria-label="Revoke invite">
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <code className="mt-2 block truncate text-xs text-muted-foreground">{url}</code>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
