import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSEO } from "@/hooks/use-seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownEditor } from "@/components/markdown-editor";
import { ImageUpload } from "@/components/image-upload";

const Schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Host name must be at least 2 characters" })
    .max(80, { message: "Host name must be 80 characters or less" }),
  bio: z
    .string()
    .max(2000, { message: "Bio must be 2000 characters or less" })
    .optional()
    .or(z.literal("")),
  contact_email: z
    .union([z.literal(""), z.string().trim().email({ message: "Enter a valid email address" }).max(255)])
    .optional(),
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
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { name: "", bio: "", contact_email: "" },
  });
  const bioValue = form.watch("bio") || "";
  const nameValue = form.watch("name") || "";

  if (!loading && !user) {
    navigate(`/sign-in?redirect=${encodeURIComponent("/become-a-host")}`);
    return null;
  }

  const onSubmit = async (values: Form) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: host, error } = await supabase
        .from("hosts")
        .insert({
          name: values.name,
          bio: values.bio || null,
          contact_email: values.contact_email || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: hmError } = await supabase
        .from("host_members")
        .insert({ host_id: host.id, user_id: user.id, role: "host" });
      if (hmError) throw hmError;

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

  const initials = (nameValue || "?").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Become a host</CardTitle>
            <CardDescription>Create a host profile to publish events on Commuvent.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUpload
                  value={null}
                  file={logoFile}
                  onFileChange={setLogoFile}
                  aspect="square"
                  fallbackText={initials}
                  helpText="PNG, JPG or WebP. Square works best."
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Host name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">Bio</Label>
                  <span className="text-xs text-muted-foreground">{bioValue.length}/2000</span>
                </div>
                <MarkdownEditor
                  value={bioValue}
                  onChange={(md) => form.setValue("bio", md, { shouldValidate: true, shouldDirty: true })}
                  placeholder="What does your community do? Use the toolbar to format text, add headings, lists, quotes, and links."
                />
                {form.formState.errors.bio && <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input id="contact_email" type="email" placeholder="you@example.com" {...form.register("contact_email")} />
                {form.formState.errors.contact_email && <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>}
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
