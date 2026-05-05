import { admin, corsHeaders, getUser, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "unauthenticated" }, 401);
    const { event_id, new_capacity } = await req.json();
    if (!event_id || typeof new_capacity !== "number") return json({ error: "bad_input" }, 400);

    const db = admin();
    const { data: ev } = await db.from("events").select("host_id, capacity").eq("id", event_id).maybeSingle();
    if (!ev) return json({ error: "not_found" }, 404);
    const { data: m } = await db.from("host_members").select("role").eq("host_id", ev.host_id).eq("user_id", user.id).maybeSingle();
    if (!m || m.role !== "host") return json({ error: "forbidden" }, 403);

    await db.from("events").update({ capacity: new_capacity }).eq("id", event_id);
    const { count } = await db.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", event_id).eq("status", "going");
    let going = count ?? 0;
    const promoted: string[] = [];
    while (new_capacity === 0 || going < new_capacity) {
      const { data: next } = await db.from("rsvps").select("*").eq("event_id", event_id).eq("status", "waitlist").order("position", { ascending: true }).limit(1).maybeSingle();
      if (!next) break;
      await db.from("rsvps").update({ status: "going", position: null }).eq("id", next.id);
      await db.from("notifications").insert({ user_id: next.user_id, type: "waitlist_promoted", payload: { event_id, rsvp_id: next.id } });
      promoted.push(next.id);
      going++;
      if (new_capacity === 0) break; // unlimited: promote all in one pass
    }
    if (new_capacity === 0) {
      // promote everyone remaining
      const { data: rest } = await db.from("rsvps").select("*").eq("event_id", event_id).eq("status", "waitlist");
      for (const r of rest ?? []) {
        await db.from("rsvps").update({ status: "going", position: null }).eq("id", r.id);
        await db.from("notifications").insert({ user_id: r.user_id, type: "waitlist_promoted", payload: { event_id, rsvp_id: r.id } });
        promoted.push(r.id);
      }
    }
    return json({ ok: true, promoted });
  } catch (e) { return json({ error: String(e) }, 500); }
});
