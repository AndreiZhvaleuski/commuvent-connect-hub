import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { toast } from "sonner";
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
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              display_name,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Welcome to Commuvent!");
          navigate(redirect);
        } else {
          // Fallback if email confirmation is still required
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            toast.success("Check your email to confirm.");
          } else {
            toast.success("Welcome to Commuvent!");
            navigate(redirect);
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirect);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };



  return (
    <><div className="container mx-auto px-4 py-20 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Welcome back" : "Join Commuvent"}</CardTitle>
            <CardDescription>
              {mode === "signin" ? "Sign in to RSVP and host events." : "Create an account to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) handlePassword();
              }}
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
    </>
  );
}
