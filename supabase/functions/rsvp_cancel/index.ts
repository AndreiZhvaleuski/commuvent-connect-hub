import { admin, corsHeaders, getUser, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "unauthenticated" }, 401);
    const { rsvp_id } = await req.json();
    if (!rsvp_id) return json({ error: "rsvp_id required" }, 400);

    const db = admin();
    const { data: r } = await db.from("rsvps").select("*").eq("id", rsvp_id).maybeSingle();
    if (!r) return json({ error: "not_found" }, 404);
    if (r.user_id !== user.id) return json({ error: "forbidden" }, 403);

    await db.from("rsvps").update({ status: "cancelled", cancelled_at: new Date().toISOString(), position: null }).eq("id", rsvp_id);

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
