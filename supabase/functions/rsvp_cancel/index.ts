import { admin, corsHeaders, getUser, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "unauthenticated" }, 401);
    const body = await req.json().catch(() => ({}));
    const { rsvp_id, event_id } = body as { rsvp_id?: string; event_id?: string };
    if (!rsvp_id && !event_id) return json({ error: "rsvp_id or event_id required" }, 400);

    const db = admin();
    const q = db.from("rsvps").select("*");
    const { data: r } = rsvp_id
      ? await q.eq("id", rsvp_id).maybeSingle()
      : await q.eq("event_id", event_id!).eq("user_id", user.id).neq("status", "cancelled").maybeSingle();
    if (!r) return json({ error: "not_found" }, 404);
    if (r.user_id !== user.id) return json({ error: "forbidden" }, 403);

    const { data: evCheck } = await db.from("events").select("end_at").eq("id", r.event_id).maybeSingle();
    if (evCheck && new Date(evCheck.end_at).getTime() < Date.now()) {
      return json({ error: "event_ended" }, 400);
    }
    const { data: ci } = await db.from("check_ins").select("id").eq("rsvp_id", r.id).eq("undone", false).maybeSingle();
    if (ci) return json({ error: "already_checked_in" }, 400);

    await db.from("rsvps").update({ status: "cancelled", cancelled_at: new Date().toISOString(), position: null }).eq("id", r.id);

    // Promote next waitlist if there's room
    const { data: ev } = await db.from("events").select("capacity").eq("id", r.event_id).single();
    const { count } = await db.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", r.event_id).eq("status", "going");
    if (ev && (ev.capacity === 0 || (count ?? 0) < ev.capacity)) {
      const { data: next } = await db.from("rsvps").select("*").eq("event_id", r.event_id).eq("status", "waitlist").order("position", { ascending: true }).limit(1).maybeSingle();
      if (next) {
        await db.from("rsvps").update({ status: "going", position: null }).eq("id", next.id);
        await db.from("notifications").insert({ user_id: next.user_id, type: "waitlist_promoted", payload: { event_id: r.event_id, rsvp_id: next.id } });
      }
    }
    return json({ ok: true });
  } catch (e) { return json({ error: String(e) }, 500); }
});
