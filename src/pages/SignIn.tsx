import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, SpinnerIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { DEMO_HOSTS, DEMO_CHECKERS, DEMO_ATTENDEES, DEMO_PASSWORD, type DemoAccount } from "@/lib/demoAccounts";

export default function SignIn({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = params.get("intent");
  const baseRedirect = params.get("redirect") || "/";
  const redirect = intent ? `${baseRedirect}${baseRedirect.includes("?") ? "&" : "?"}intent=${encodeURIComponent(intent)}` : baseRedirect;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSecret, setSeedSecret] = useState("");
  const [seedError, setSeedError] = useState<string | null>(null);

  const handlePassword = async () => {
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!firstName.trim() || !lastName.trim()) {
          setBusy(false);
          return toast.error("Please enter your first and last name");
        }
        const display_name = `${firstName.trim()} ${lastName.trim()}`;
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirect}`,
            data: { first_name: firstName.trim(), last_name: lastName.trim(), display_name },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Welcome to Commuvent!");
          navigate(redirect);
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) toast.success("Check your email to confirm.");
          else { toast.success("Welcome to Commuvent!"); navigate(redirect); }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirect);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const useAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(DEMO_PASSWORD);
    setDemoOpen(false);
    toast.success(`Filled ${acc.name}`);
    if (mode === "signup") {
      navigate(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
    }
  };

  const reseed = async () => {
    const secret = seedSecret.trim();
    setSeedError(null);
    if (!secret) return toast.error("Enter the SEED_SECRET value");
    setSeeding(true);
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/seed_demo`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-seed-secret": secret,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: "{}",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.ok === false) {
        const message = data?.error === "Invalid SEED_SECRET" || r.status === 401
          ? "Incorrect seed secret. Demo data was not re-seeded."
          : data?.error || `Seed failed (${r.status})`;
        setSeedError(message);
        return toast.error(message);
      }
      toast.success(`Re-seeded! ${JSON.stringify(data.summary ?? {})}`);
    } catch (e: any) {
      const message = e.message ?? "Re-seed failed";
      setSeedError(message);
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  };

  const Section = ({ value, title, accounts }: { value: string; title: string; accounts: DemoAccount[] }) => (
    <AccordionItem value={value}>
      <AccordionTrigger>{title} <span className="ml-2 text-xs font-normal text-muted-foreground">({accounts.length})</span></AccordionTrigger>
      <AccordionContent>
        <div className="space-y-1">
          {accounts.map((a) => (
            <div key={a.email} className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{a.name}{a.detail ? <span className="text-muted-foreground"> · {a.detail}</span> : null}</div>
                <div className="truncate text-xs text-muted-foreground">{a.email}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => useAccount(a)}>Use</Button>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="container mx-auto px-4 py-20 max-w-md">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle>{mode === "signin" ? "Welcome back" : "Join Commuvent"}</CardTitle>
              <CardDescription>
                {mode === "signin" ? "Sign in to RSVP and host events." : "Create an account to get started."}
              </CardDescription>
            </div>
            <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
              <Button variant="ghost" size="icon" aria-label="Demo accounts" className="shrink-0" onClick={() => setDemoOpen(true)}>
                <InfoIcon className="h-5 w-5" />
              </Button>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Demo accounts</DialogTitle>
                  <DialogDescription>
                    Password for all demo users: <code className="rounded bg-muted px-1.5 py-0.5">{DEMO_PASSWORD}</code>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Accordion defaultValue={["hosts"]}>
                    <Section value="hosts" title="Hosts" accounts={DEMO_HOSTS} />
                    <Section value="checkers" title="Checkers" accounts={DEMO_CHECKERS} />
                    <Section value="attendees" title="Attendees" accounts={DEMO_ATTENDEES} />
                  </Accordion>
                  <div className="space-y-2 rounded-md border p-3">
                    <h4 className="text-sm font-semibold">Re-seed demo data</h4>
                    <p className="text-xs text-muted-foreground">
                      Wipes ALL data + auth users + storage and reseeds. Requires the project's <code>SEED_SECRET</code>.
                    </p>
                    <Input
                      type="password"
                      placeholder="Paste the SEED_SECRET value"
                      value={seedSecret}
                      onChange={(e) => { setSeedSecret(e.target.value); setSeedError(null); }}
                    />
                    {seedError ? (
                      <Alert variant="destructive">
                        <AlertDescription>{seedError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button onClick={reseed} disabled={seeding} className="w-full">
                      {seeding ? <><SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />Re-seeding…</> : "Re-seed demo data"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (!busy) handlePassword(); }}
          >
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>No account? <Link to={`/sign-up?redirect=${encodeURIComponent(redirect)}`} className="text-foreground underline">Sign up</Link></>
            ) : (
              <>Already have an account? <Link to={`/sign-in?redirect=${encodeURIComponent(redirect)}`} className="text-foreground underline">Sign in</Link></>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
