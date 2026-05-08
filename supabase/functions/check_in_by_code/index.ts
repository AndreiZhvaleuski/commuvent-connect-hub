import { admin, corsHeaders, getUser, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "unauthenticated" }, 401);
    const { event_id, code } = await req.json();
    if (!event_id || !code) return json({ error: "bad_input" }, 400);

    const db = admin();
    const { data: ev } = await db.from("events").select("host_id, end_at").eq("id", event_id).maybeSingle();
    if (!ev) return json({ status: "not_found" });
    const { data: m } = await db.from("host_members").select("role").eq("host_id", ev.host_id).eq("user_id", user.id).maybeSingle();
    if (!m) return json({ error: "forbidden" }, 403);

    const ended = new Date(ev.end_at).getTime() < Date.now();
    if (ended && m.role !== "host") return json({ status: "event_ended" });

    const { data: rsvp } = await db.from("rsvps").select("*").eq("code", code.toUpperCase()).maybeSingle();
    if (!rsvp) return json({ status: "not_found" });
    if (rsvp.event_id !== event_id) return json({ status: "wrong_event" });
    if (rsvp.cancelled_at) return json({ status: "cancelled", rsvp });
    if (rsvp.status !== "going") return json({ status: "not_going", rsvp });

    const { data: existing } = await db.from("check_ins").select("id, undone").eq("rsvp_id", rsvp.id).maybeSingle();
    if (existing && !existing.undone) return json({ status: "duplicate", rsvp });
    if (existing && existing.undone) {
      await db.from("check_ins").update({ undone: false, checked_in_at: new Date().toISOString(), checked_in_by: user.id }).eq("id", existing.id);
      return json({ status: "ok", rsvp });
    }
    await db.from("check_ins").insert({ rsvp_id: rsvp.id, event_id, checked_in_by: user.id });
    return json({ status: "ok", rsvp });
  } catch (e) { return json({ error: String(e) }, 500); }
});
