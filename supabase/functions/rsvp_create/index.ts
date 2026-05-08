import { admin, corsHeaders, getUser, json, nano } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "unauthenticated" }, 401);
    const body = await req.json().catch(() => ({}));
    const { event_id } = body ?? {};
    console.log("rsvp_create payload", { event_id, user_id: user.id });
    if (!event_id) return json({ error: "event_id required" }, 400);

    const db = admin();
    const { data: ev, error: evErr } = await db.from("events").select("id, capacity, status, host_id").eq("id", event_id).maybeSingle();
    if (evErr) {
      console.error("event lookup error", evErr);
      return json({ error: "event_lookup_failed", detail: evErr.message }, 500);
    }
    if (!ev) {
      console.warn("event_not_found", { event_id });
      return json({ error: "event_not_found", event_id }, 404);
    }
    if (ev.status !== "published") return json({ error: "event_not_published" }, 400);

    const { data: existing } = await db.from("rsvps").select("*").eq("event_id", event_id).eq("user_id", user.id).maybeSingle();
    if (existing && existing.status !== "cancelled") return json({ rsvp: existing });

    const { count } = await db.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", event_id).eq("status", "going");
    const goingCount = count ?? 0;
    let status: "going" | "waitlist" = "going";
    let position: number | null = null;
    if (ev.capacity > 0 && goingCount >= ev.capacity) {
      status = "waitlist";
      const { data: last } = await db.from("rsvps").select("position").eq("event_id", event_id).eq("status", "waitlist").order("position", { ascending: false }).limit(1).maybeSingle();
      position = (last?.position ?? 0) + 1;
    }

    let code = "";
    for (let i = 0; i < 5; i++) {
      code = nano(8);
      const { data: dup } = await db.from("rsvps").select("id").eq("code", code).maybeSingle();
      if (!dup) break;
    }

    if (existing) {
      const { data, error } = await db.from("rsvps").update({ status, position, code, cancelled_at: null }).eq("id", existing.id).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ rsvp: data });
    }
    const { data, error } = await db.from("rsvps").insert({ event_id, user_id: user.id, status, position, code }).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ rsvp: data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
