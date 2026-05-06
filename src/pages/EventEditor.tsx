import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CopyIcon as Copy, EyeIcon as Eye, EyeSlashIcon as EyeOff, MapPinIcon, GlobeIcon } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSEO } from "@/hooks/use-seo";
import { listTimezones, browserTz } from "@/lib/timezones";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MarkdownEditor } from "@/components/markdown-editor";
import { ImageUpload } from "@/components/image-upload";
import { TimezonePicker } from "@/components/timezone-picker";
import { DateTimePicker } from "@/components/datetime-picker";

const HALF_HOUR = 30 * 60 * 1000;
const MAX_CAPACITY = 10000;
const MAX_DESC = 8000;

const Schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, { message: "Title must be at least 2 characters" })
      .max(120, { message: "Title must be 120 characters or less" }),
    description: z
      .string()
      .max(MAX_DESC, { message: `Description must be ${MAX_DESC} characters or less` })
      .optional()
      .or(z.literal("")),
    time_zone: z.string().min(1, { message: "Pick a time zone" }),
    start_at: z.date({ required_error: "Start time is required" }),
    end_at: z.date({ required_error: "End time is required" }),
    capacity: z.coerce
      .number({ invalid_type_error: "Capacity is required" })
      .int({ message: "Capacity must be a whole number" })
      .min(1, { message: "Capacity must be at least 1" })
      .max(MAX_CAPACITY, { message: `Capacity must be ${MAX_CAPACITY.toLocaleString()} or less` }),
    visibility: z.enum(["public", "unlisted"]),
    location_mode: z.enum(["in_person", "online"]),
    venue_address: z.string().max(300).optional().or(z.literal("")),
    online_url: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.end_at.getTime() - v.start_at.getTime() < HALF_HOUR) {
      ctx.addIssue({ code: "custom", path: ["end_at"], message: "Event must be at least 30 minutes long" });
    }
    if (v.location_mode === "in_person") {
      if (!v.venue_address || v.venue_address.trim().length < 3) {
        ctx.addIssue({ code: "custom", path: ["venue_address"], message: "Enter a venue address" });
      }
    } else {
      const url = (v.online_url || "").trim();
      if (!url) {
        ctx.addIssue({ code: "custom", path: ["online_url"], message: "Enter an online link" });
      } else if (!/^https?:\/\/\S+\.\S+/i.test(url)) {
        ctx.addIssue({ code: "custom", path: ["online_url"], message: "Enter a valid link starting with http:// or https://" });
      }
    }
  });

type Form = z.infer<typeof Schema>;

function nextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function shortId() {
  return Math.random().toString(36).slice(2, 7);
}

function formatNowIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz, dateStyle: "medium", timeStyle: "short",
    }).format(new Date());
  } catch { return ""; }
}

export default function EventEditor() {
  const { hostId, eventId } = useParams<{ hostId: string; eventId?: string }>();
  const isEdit = Boolean(eventId);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [persistedSlug, setPersistedSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [busy, setBusy] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(isEdit);
  const [, forceTick] = useState(0);

  const tzs = useMemo(() => listTimezones(), []);

  useSEO({
    title: isEdit ? "Edit event — Commuvent" : "New event — Commuvent",
    description: "Create or edit a community event on Commuvent.",
  });

  const initialStart = nextHour();
  const initialEnd = new Date(initialStart.getTime() + 60 * 60 * 1000);

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      time_zone: browserTz(),
      start_at: initialStart,
      end_at: initialEnd,
      capacity: 50,
      visibility: "public",
      location_mode: "in_person",
      venue_address: "",
      online_url: "",
    },
  });

  // Live "now in TZ" hint
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!isEdit) return;
    (async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId!).maybeSingle();
      if (error || !data) {
        toast.error("Event not found");
        navigate(`/dashboard/${hostId}`);
        return;
      }
      const mode: Form["location_mode"] = data.online_url ? "online" : "in_person";
      const visibility: Form["visibility"] = data.visibility === "unlisted" ? "unlisted" : "public";
      form.reset({
        title: data.title,
        description: data.description ?? "",
        time_zone: data.time_zone,
        start_at: new Date(data.start_at),
        end_at: new Date(data.end_at),
        capacity: data.capacity || 50,
        visibility,
        location_mode: mode,
        venue_address: data.venue_address ?? "",
        online_url: data.online_url ?? "",
      });
      setStatus(data.status);
      setCoverUrl(data.cover_image_url);
      setPersistedSlug(data.slug ?? null);
      setBootstrapping(false);
    })();
  }, [eventId, hostId, isEdit, user, loading, navigate, form]);

  const uploadCoverIfAny = async (id: string): Promise<string | null> => {
    if (!coverFile) return null;
    const ext = coverFile.name.split(".").pop() || "jpg";
    const path = `${id}/cover.${ext}`;
    const { error } = await supabase.storage.from("event-covers").upload(path, coverFile, {
      upsert: true,
      contentType: coverFile.type,
    });
    if (error) {
      toast.error(`Cover upload failed: ${error.message}`);
      return null;
    }
    return supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
  };

  const computeSlug = (title: string): string => {
    if (persistedSlug) return persistedSlug;
    const base = slugify(title) || `event-${shortId()}`;
    return base;
  };

  const save = async (values: Form, nextStatus?: string): Promise<string | null> => {
    if (!user || !hostId) return null;
    setBusy(true);
    try {
      const slug = computeSlug(values.title);
      const payload = {
        host_id: hostId,
        title: values.title,
        slug,
        description: values.description || null,
        time_zone: values.time_zone,
        start_at: values.start_at.toISOString(),
        end_at: values.end_at.toISOString(),
        capacity: values.capacity,
        visibility: values.visibility,
        venue_address: values.location_mode === "in_person" ? values.venue_address || null : null,
        online_url: values.location_mode === "online" ? values.online_url || null : null,
        is_paid: false,
        ...(nextStatus ? { status: nextStatus } : {}),
      };

      let id = eventId ?? null;

      const insertWithRetry = async (slugTry: string) => {
        const { data, error } = await supabase.from("events")
          .insert({ ...payload, slug: slugTry, created_by: user.id, status: nextStatus ?? "draft" })
          .select("id, slug").single();
        return { data, error };
      };

      if (isEdit && id) {
        const { error } = await supabase.from("events").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        let attempt = await insertWithRetry(slug);
        if (attempt.error && /unique|duplicate/i.test(attempt.error.message)) {
          attempt = await insertWithRetry(`${slug}-${shortId()}`);
        }
        if (attempt.error) throw attempt.error;
        id = attempt.data!.id;
        setPersistedSlug(attempt.data!.slug);
      }

      const newCover = await uploadCoverIfAny(id!);
      if (newCover) {
        await supabase.from("events").update({ cover_image_url: newCover }).eq("id", id!);
        setCoverUrl(newCover);
      }
      if (nextStatus) setStatus(nextStatus);
      toast.success("Saved");
      return id;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const onError = () => toast.error("Please fix the highlighted fields");

  const onSaveDraft = form.handleSubmit(async (v) => {
    const id = await save(v);
    if (id && !isEdit) navigate(`/dashboard/${hostId}/events/${id}/edit`);
  }, onError);
  const onPublish = form.handleSubmit(async (v) => {
    const id = await save(v, "published");
    if (id && !isEdit) navigate(`/dashboard/${hostId}/events/${id}/edit`);
  }, onError);
  const onUnpublish = form.handleSubmit(async (v) => { await save(v, "draft"); }, onError);

  const onDuplicate = async () => {
    if (!eventId || !hostId) return;
    const valid = await form.trigger();
    if (!valid) { toast.error("Please fix the highlighted fields first"); return; }
    const v = form.getValues();
    setBusy(true);
    try {
      const baseSlug = (persistedSlug || slugify(v.title) || `event-${shortId()}`) + `-copy-${shortId()}`;
      const { data, error } = await supabase.from("events").insert({
        host_id: hostId,
        title: `${v.title} (copy)`,
        slug: baseSlug,
        description: v.description || null,
        time_zone: v.time_zone,
        start_at: v.start_at.toISOString(),
        end_at: v.end_at.toISOString(),
        capacity: v.capacity,
        visibility: v.visibility,
        venue_address: v.location_mode === "in_person" ? v.venue_address || null : null,
        online_url: v.location_mode === "online" ? v.online_url || null : null,
        is_paid: false,
        status: "draft",
        created_by: user!.id,
        cover_image_url: coverUrl,
      }).select("id").single();
      if (error) throw error;
      toast.success("Duplicated");
      navigate(`/dashboard/${hostId}/events/${data.id}/edit`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    } finally { setBusy(false); }
  };

  if (bootstrapping) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
      </AppLayout>
    );
  }

  const tz = form.watch("time_zone");
  const { setValue } = form;
  const onTzChange = useCallback(
    (v: string) => setValue("time_zone", v, { shouldValidate: true, shouldDirty: true }),
    [setValue]
  );
  const description = form.watch("description") || "";
  const locationMode = form.watch("location_mode");

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
              <Field label="Cover image">
                <ImageUpload
                  value={coverUrl}
                  file={coverFile}
                  onFileChange={setCoverFile}
                  aspect="video"
                  helpText="Recommended 16:9. PNG, JPG or WebP."
                />
              </Field>
              <Field label="Title" error={form.formState.errors.title?.message}>
                <Input {...form.register("title")} placeholder="A memorable name for your event" />
              </Field>
              <Field
                label="Description"
                error={form.formState.errors.description?.message}
                hint={`${description.length}/${MAX_DESC}`}
              >
                <MarkdownEditor
                  value={description}
                  onChange={(md) => form.setValue("description", md, { shouldValidate: true, shouldDirty: true })}
                  placeholder="What is this event about? Use the toolbar for formatting."
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>When &amp; where</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Time zone"
                error={form.formState.errors.time_zone?.message}
                hint={tz ? `Now in ${tz}: ${formatNowIn(tz)}` : undefined}
              >
                <TimezonePicker value={tz} onChange={onTzChange} options={tzs} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start" error={form.formState.errors.start_at?.message}>
                  <DateTimePicker
                    value={form.watch("start_at")}
                    onChange={(d) => {
                      form.setValue("start_at", d, { shouldValidate: true, shouldDirty: true });
                      const end = form.getValues("end_at");
                      if (!end || end.getTime() - d.getTime() < HALF_HOUR) {
                        form.setValue("end_at", new Date(d.getTime() + 60 * 60 * 1000), { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                  />
                </Field>
                <Field label="End" error={form.formState.errors.end_at?.message}>
                  <DateTimePicker
                    value={form.watch("end_at")}
                    minDate={form.watch("start_at") ?? undefined}
                    onChange={(d) => form.setValue("end_at", d, { shouldValidate: true, shouldDirty: true })}
                  />
                </Field>
              </div>

              <Field label="Location">
                <RadioGroup
                  value={locationMode}
                  onValueChange={(v) => form.setValue("location_mode", v as Form["location_mode"], { shouldValidate: true })}
                  className="grid grid-cols-2 gap-2"
                >
                  {([
                    { v: "in_person", label: "In person", icon: <MapPinIcon className="h-4 w-4" /> },
                    { v: "online", label: "Online", icon: <GlobeIcon className="h-4 w-4" /> },
                  ] as const).map((opt) => (
                    <label
                      key={opt.v}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        locationMode === opt.v ? "border-primary bg-primary/5" : "hover:bg-accent"
                      )}
                    >
                      <RadioGroupItem value={opt.v} id={`loc-${opt.v}`} />
                      {opt.icon}
                      {opt.label}
                    </label>
                  ))}
                </RadioGroup>
              </Field>

              {locationMode === "in_person" ? (
                <Field label="Venue address" error={form.formState.errors.venue_address?.message}>
                  <Input {...form.register("venue_address")} placeholder="123 Main St, Springfield" />
                </Field>
              ) : (
                <Field label="Online link" error={form.formState.errors.online_url?.message}>
                  <Input {...form.register("online_url")} placeholder="https://meet.example.com/abc" />
                </Field>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Capacity" error={form.formState.errors.capacity?.message}>
                <Input
                  type="number"
                  min={1}
                  max={MAX_CAPACITY}
                  step={1}
                  {...form.register("capacity")}
                />
              </Field>
              <Field label="Visibility">
                <RadioGroup
                  value={form.watch("visibility")}
                  onValueChange={(v) => form.setValue("visibility", v as Form["visibility"])}
                  className="flex flex-wrap gap-4"
                >
                  {(["public", "unlisted"] as const).map((v) => (
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
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Switch checked={false} disabled aria-label="Paid (coming soon)" />
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

function Field({
  label, error, hint, children,
}: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
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
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", map[status] ?? map.draft)}>
      {status}
    </span>
  );
}
