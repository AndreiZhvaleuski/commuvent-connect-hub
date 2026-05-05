import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckIcon as Check, CaretUpDownIcon as ChevronsUpDown, CopyIcon as Copy, EyeIcon as Eye, EyeSlashIcon as EyeOff } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSEO } from "@/hooks/use-seo";
import { listTimezones, browserTz } from "@/lib/timezones";
import { slugify, toLocalInputValue, fromLocalInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const Schema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().max(8000).optional().or(z.literal("")),
  time_zone: z.string().min(1),
  start_at_local: z.string().min(1, "Start time required"),
  end_at_local: z.string().min(1, "End time required"),
  capacity: z.coerce.number().int().min(0).max(100000),
  visibility: z.enum(["public", "unlisted", "private"]),
  venue_address: z.string().max(300).optional().or(z.literal("")),
  online_url: z.string().url().optional().or(z.literal("")),
});
type Form = z.infer<typeof Schema>;

export default function EventEditor() {
  const { hostId, eventId } = useParams<{ hostId: string; eventId?: string }>();
  const isEdit = Boolean(eventId);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [busy, setBusy] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(isEdit);

  const tzs = useMemo(() => listTimezones(), []);

  useSEO({ title: isEdit ? "Edit event — Commuvent" : "New event — Commuvent", description: "Create or edit a community event on Commuvent." });

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: {
      title: "", slug: "", description: "",
      time_zone: browserTz(),
      start_at_local: "", end_at_local: "",
      capacity: 0, visibility: "public",
      venue_address: "", online_url: "",
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`); return; }
    if (!isEdit) return;
    (async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId!).maybeSingle();
      if (error || !data) { toast.error("Event not found"); navigate(`/dashboard/${hostId}`); return; }
      form.reset({
        title: data.title,
        slug: data.slug ?? "",
        description: data.description ?? "",
        time_zone: data.time_zone,
        start_at_local: toLocalInputValue(data.start_at),
        end_at_local: toLocalInputValue(data.end_at),
        capacity: data.capacity,
        visibility: data.visibility as Form["visibility"],
        venue_address: data.venue_address ?? "",
        online_url: data.online_url ?? "",
      });
      setStatus(data.status);
      setCoverUrl(data.cover_image_url);
      setBootstrapping(false);
    })();
  }, [eventId, hostId, isEdit, user, loading, navigate, form]);

  const uploadCoverIfAny = async (id: string): Promise<string | null> => {
    if (!coverFile) return null;
    const ext = coverFile.name.split(".").pop() || "jpg";
    const path = `${id}/cover.${ext}`;
    const { error } = await supabase.storage.from("event-covers").upload(path, coverFile, { upsert: true, contentType: coverFile.type });
    if (error) { toast.error(`Cover upload failed: ${error.message}`); return null; }
    return supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
  };

  const save = async (values: Form, nextStatus?: string): Promise<string | null> => {
    if (!user || !hostId) return null;
    const start_at = fromLocalInputValue(values.start_at_local);
    const end_at = fromLocalInputValue(values.end_at_local);
    if (!start_at || !end_at) { toast.error("Invalid date"); return null; }
    if (new Date(end_at) <= new Date(start_at)) { toast.error("End must be after start"); return null; }

    setBusy(true);
    try {
      const payload = {
        host_id: hostId,
        title: values.title,
        slug: values.slug,
        description: values.description || null,
        time_zone: values.time_zone,
        start_at, end_at,
        capacity: values.capacity,
        visibility: values.visibility,
        venue_address: values.venue_address || null,
        online_url: values.online_url || null,
        is_paid: false,
        ...(nextStatus ? { status: nextStatus } : {}),
      };
      let id = eventId ?? null;
      if (isEdit && id) {
        const { error } = await supabase.from("events").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("events")
          .insert({ ...payload, created_by: user.id, status: nextStatus ?? "draft" })
          .select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const newCover = await uploadCoverIfAny(id!);
      if (newCover) await supabase.from("events").update({ cover_image_url: newCover }).eq("id", id!);
      if (nextStatus) setStatus(nextStatus);
      toast.success("Saved");
      return id;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return null;
    } finally { setBusy(false); }
  };

  const onSaveDraft = form.handleSubmit(async (v) => {
    const id = await save(v);
    if (id && !isEdit) navigate(`/dashboard/${hostId}/events/${id}/edit`);
  });
  const onPublish = form.handleSubmit(async (v) => {
    const id = await save(v, "published");
    if (id && !isEdit) navigate(`/dashboard/${hostId}/events/${id}/edit`);
  });
  const onUnpublish = form.handleSubmit(async (v) => { await save(v, "draft"); });

  const onDuplicate = async () => {
    if (!eventId || !hostId) return;
    const v = form.getValues();
    const start_at = fromLocalInputValue(v.start_at_local);
    const end_at = fromLocalInputValue(v.end_at_local);
    if (!start_at || !end_at) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from("events").insert({
        host_id: hostId, title: `${v.title} (copy)`, slug: `${v.slug}-copy-${Date.now().toString(36)}`,
        description: v.description || null, time_zone: v.time_zone, start_at, end_at,
        capacity: v.capacity, visibility: v.visibility,
        venue_address: v.venue_address || null, online_url: v.online_url || null,
        is_paid: false, status: "draft", created_by: user!.id, cover_image_url: coverUrl,
      }).select("id").single();
      if (error) throw error;
      toast.success("Duplicated");
      navigate(`/dashboard/${hostId}/events/${data.id}/edit`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    } finally { setBusy(false); }
  };

  if (bootstrapping) return <AppLayout><div className="container mx-auto px-4 py-12"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{isEdit ? "Edit event" : "New event"}</h1>
          {isEdit && <Badge status={status} />}
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <Card>
            <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Title" error={form.formState.errors.title?.message}>
                <Input {...form.register("title")} onChange={(e) => {
                  form.setValue("title", e.target.value);
                  if (!isEdit && !form.getValues("slug")) form.setValue("slug", slugify(e.target.value));
                }} />
              </Field>
              <Field label="Slug" error={form.formState.errors.slug?.message}>
                <Input {...form.register("slug")} />
              </Field>
              <Field label="Description (Markdown)">
                <Textarea rows={6} {...form.register("description")} />
              </Field>
              <Field label="Cover image">
                {coverUrl && <img src={coverUrl} alt="Cover" className="mb-2 aspect-video w-full rounded-lg object-cover" />}
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>When &amp; where</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Time zone">
                <TimezonePicker value={form.watch("time_zone")} onChange={(v) => form.setValue("time_zone", v)} options={tzs} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start" error={form.formState.errors.start_at_local?.message}>
                  <Input type="datetime-local" {...form.register("start_at_local")} />
                </Field>
                <Field label="End" error={form.formState.errors.end_at_local?.message}>
                  <Input type="datetime-local" {...form.register("end_at_local")} />
                </Field>
              </div>
              <Field label="Venue address">
                <Input {...form.register("venue_address")} placeholder="123 Main St, Springfield" />
              </Field>
              <Field label="Online URL" error={form.formState.errors.online_url?.message}>
                <Input {...form.register("online_url")} placeholder="https://meet.example.com/abc" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Capacity (0 = unlimited)" error={form.formState.errors.capacity?.message}>
                <Input type="number" min={0} {...form.register("capacity")} />
              </Field>
              <Field label="Visibility">
                <RadioGroup
                  value={form.watch("visibility")}
                  onValueChange={(v) => form.setValue("visibility", v as Form["visibility"])}
                  className="flex flex-wrap gap-4"
                >
                  {(["public", "unlisted", "private"] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm capitalize">
                      <RadioGroupItem value={v} id={`vis-${v}`} /> {v}
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              <div className="flex items-center gap-3">
                <Label className="text-sm">Pricing</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Free</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex"><Switch checked={false} disabled aria-label="Paid (coming soon)" /></span>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                  <span className="text-muted-foreground">Paid</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onSaveDraft} disabled={busy}>Save draft</Button>
              {status !== "published" ? (
                <Button type="button" onClick={onPublish} disabled={busy}><Eye className="mr-1 h-4 w-4" />Publish</Button>
              ) : (
                <Button type="button" variant="outline" onClick={onUnpublish} disabled={busy}><EyeOff className="mr-1 h-4 w-4" />Unpublish</Button>
              )}
              {isEdit && <Button type="button" variant="outline" onClick={onDuplicate} disabled={busy}><Copy className="mr-1 h-4 w-4" />Duplicate</Button>}
            </div>
            <Button type="button" variant="ghost" onClick={() => navigate(`/dashboard/${hostId}`)}>Back to dashboard</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-primary/15 text-primary",
    draft: "bg-muted text-muted-foreground",
  };
  return <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", map[status] ?? map.draft)}>{status}</span>;
}

function TimezonePicker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value || "Pick a time zone"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Search time zones…" />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {options.map((tz) => (
                <CommandItem key={tz} value={tz} onSelect={() => { onChange(tz); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === tz ? "opacity-100" : "opacity-0")} />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
