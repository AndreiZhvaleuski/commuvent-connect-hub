import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UploadSimpleIcon as Upload, TrashIcon as Trash2 } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSEO } from "@/hooks/use-seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownEditor } from "@/components/markdown-editor";

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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { name: "", bio: "", contact_email: "" },
  });
  const bioValue = form.watch("bio") || "";
  const nameValue = form.watch("name") || "";

  useEffect(() => {
    if (!logoFile) { setLogoPreview(null); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  if (!loading && !user) {
    navigate(`/sign-in?redirect=${encodeURIComponent("/become-a-host")}`);
    return null;
  }

  const pickFile = (f: File | null) => {
    if (f && !f.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setLogoFile(f);
  };

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
                <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
                  <Avatar className="h-20 w-20">
                    {logoPreview && <AvatarImage src={logoPreview} alt="Logo preview" />}
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{logoFile ? logoFile.name : "No logo selected"}</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Square works best.</p>
                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                        <Upload className="mr-1 h-4 w-4" />
                        {logoFile ? "Replace" : "Choose file"}
                      </Button>
                      {logoFile && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => pickFile(null)}>
                          <Trash2 className="mr-1 h-4 w-4" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </div>
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
