import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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

type Props = { mode: "create" | "edit" };

export default function HostEditor({ mode }: Props) {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageBusy, setPageBusy] = useState(mode === "edit");

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { name: "", bio: "", contact_email: "" },
  });
  const bioValue = form.watch("bio") || "";
  const nameValue = form.watch("name") || "";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirect = mode === "edit" ? `/dashboard/${hostId}/edit` : "/become-a-host";
      navigate(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (mode !== "edit" || !hostId) return;
    (async () => {
      setPageBusy(true);
      const { data: hm } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", hostId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!hm || hm.role !== "host") {
        toast.error("You don't have permission to edit this host");
        navigate(`/dashboard/${hostId}`);
        return;
      }
      const { data: h } = await supabase
        .from("hosts")
        .select("name,bio,logo_url,contact_email")
        .eq("id", hostId)
        .maybeSingle();
      if (!h) {
        toast.error("Host not found");
        navigate("/");
        return;
      }
      form.reset({ name: h.name, bio: h.bio ?? "", contact_email: h.contact_email ?? "" });
      setLogoUrl(h.logo_url ?? null);
      setPageBusy(false);
    })();
  }, [mode, hostId, user, loading, navigate, form]);

  const uploadLogo = async (id: string): Promise<string | null> => {
    if (!logoFile) return null;
    const ext = logoFile.name.split(".").pop() || "png";
    const path = `${id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("host-logos")
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("host-logos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const onSubmit = async (values: Form) => {
    if (!user) return;
    setSubmitting(true);
    try {
      if (mode === "create") {
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

        const newLogo = await uploadLogo(host.id);
        if (newLogo) await supabase.from("hosts").update({ logo_url: newLogo }).eq("id", host.id);

        toast.success("Host created");
        navigate(`/dashboard/${host.id}`);
      } else {
        if (!hostId) return;
        const newLogo = await uploadLogo(hostId);
        const { error } = await supabase
          .from("hosts")
          .update({
            name: values.name,
            bio: values.bio || null,
            contact_email: values.contact_email || null,
            ...(newLogo ? { logo_url: newLogo } : {}),
          })
          .eq("id", hostId);
        if (error) throw error;
        toast.success("Host updated");
        navigate(`/dashboard/${hostId}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save host";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (nameValue || "?").slice(0, 2).toUpperCase();
  const isEdit = mode === "edit";

  if (pageBusy) {
    return (
      <><div className="container mx-auto max-w-2xl px-4 py-12">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
      </>
    );
  }

  return (
    <><div className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Edit host" : "Become a host"}</CardTitle>
            <CardDescription>
              {isEdit
                ? "Update your host profile, logo, and bio."
                : "Create a host profile to publish events on Commuvent."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUpload
                  value={logoUrl}
                  file={logoFile}
                  onFileChange={setLogoFile}
                  aspect="square"
                  fallbackText={initials}
                  helpText="PNG, JPG or WebP. We'll crop to a square."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Host name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">Bio</Label>
                  <span className="text-xs text-muted-foreground">{bioValue.length}/2000</span>
                </div>
                <Textarea
                  id="bio"
                  value={bioValue}
                  onChange={(e) => form.setValue("bio", e.target.value, { shouldValidate: true, shouldDirty: true })}
                  placeholder="What does your community do?"
                  rows={6}
                  maxLength={2000}
                />
                {form.formState.errors.bio && <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input id="contact_email" type="email" placeholder="you@example.com" {...form.register("contact_email")} />
                {form.formState.errors.contact_email && <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>}
              </div>

              <div className="flex gap-2">
                {isEdit && (
                  <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(`/dashboard/${hostId}`)}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Saving…" : isEdit ? "Save changes" : "Create host"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
