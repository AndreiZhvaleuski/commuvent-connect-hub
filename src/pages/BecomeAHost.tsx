import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSEO } from "@/hooks/use-seo";
import { slugify } from "@/lib/format";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Schema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  bio: z.string().max(500).optional().or(z.literal("")),
  contact_email: z.string().email().optional().or(z.literal("")),
});
type Form = z.infer<typeof Schema>;

export default function BecomeAHost() {
  useSEO({ title: "Become a host — Commuvent", description: "Create a host profile and start gathering your community on Commuvent." });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", slug: "", bio: "", contact_email: "" },
  });

  if (!loading && !user) {
    navigate(`/sign-in?redirect=${encodeURIComponent("/become-a-host")}`);
    return null;
  }

  const onName = (v: string) => {
    form.setValue("name", v);
    if (!form.getValues("slug")) form.setValue("slug", slugify(v));
  };

  const onSubmit = async (values: Form) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // 1. Create host row
      const { data: host, error } = await supabase
        .from("hosts")
        .insert({
          name: values.name,
          slug: values.slug,
          bio: values.bio || null,
          contact_email: values.contact_email || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          form.setError("slug", { message: "This slug is already taken. Try another." });
          toast.error("That URL slug is already taken");
          setSubmitting(false);
          return;
        }
        throw error;
      }

      // 2. Add creator as host member with role "host"
      const { error: hmError } = await supabase
        .from("host_members")
        .insert({ host_id: host.id, user_id: user.id, role: "host" });
      if (hmError) throw hmError;

      // 3. Optional logo upload
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${host.id}/logo.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("host-logos")
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("host-logos").getPublicUrl(path);
          await supabase.from("hosts").update({ logo_url: pub.publicUrl }).eq("id", host.id);
        }
      }

      toast.success("Host created");
      navigate(`/dashboard/${host.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not create host";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Become a host</CardTitle>
            <CardDescription>Create a host profile to publish events on Commuvent.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Host name</Label>
                <Input id="name" {...form.register("name")} onChange={(e) => onName(e.target.value)} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL slug</Label>
                <Input id="slug" {...form.register("slug")} placeholder="acme-meetup" />
                <p className="text-xs text-muted-foreground">commuvent.app/h/{form.watch("slug") || "your-slug"}</p>
                {form.formState.errors.slug && <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} {...form.register("bio")} placeholder="What does your community do?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input id="contact_email" type="email" {...form.register("contact_email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <Input id="logo" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating…" : "Create host"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
