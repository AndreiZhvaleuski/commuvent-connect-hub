import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useSEO } from "@/hooks/use-seo";

export default function SignIn({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  useSEO({
    title: mode === "signin" ? "Sign in" : "Sign up",
    description: "Access your Commuvent account.",
  });
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

  const handlePassword = async () => {
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!firstName.trim() || !lastName.trim()) {
          setBusy(false);
          return toast.error("Please enter your first and last name");
        }
        const display_name = `${firstName.trim()} ${lastName.trim()}`;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirect}`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              display_name,
            },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirect);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const handleMagic = async () => {
    if (!email) return toast.error("Enter your email first");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${redirect}` },
      });
      if (error) throw error;
      toast.success("Magic link sent — check your email.");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-20 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Welcome back" : "Join Commuvent"}</CardTitle>
            <CardDescription>
              {mode === "signin" ? "Sign in to RSVP and host events." : "Create an account to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="password">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic">Magic link</TabsTrigger>
              </TabsList>
              <TabsContent value="password" className="space-y-4 pt-4">
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
                <Button className="w-full" onClick={handlePassword} disabled={busy}>
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </TabsContent>
              <TabsContent value="magic" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-m">Email</Label>
                  <Input id="email-m" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleMagic} disabled={busy}>Send magic link</Button>
              </TabsContent>
            </Tabs>
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
    </AppLayout>
  );
}
