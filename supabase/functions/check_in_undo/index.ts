import { admin, corsHeaders, getUser, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "unauthenticated" }, 401);
    const { event_id } = await req.json();
    if (!event_id) return json({ error: "bad_input" }, 400);

    const db = admin();
    const { data: ev } = await db.from("events").select("host_id, end_at").eq("id", event_id).maybeSingle();
    if (!ev) return json({ error: "not_found" }, 404);
    const { data: m } = await db.from("host_members").select("role").eq("host_id", ev.host_id).eq("user_id", user.id).maybeSingle();
    if (!m) return json({ error: "forbidden" }, 403);

    const ended = new Date(ev.end_at).getTime() < Date.now();
    if (ended) return json({ ok: false, error: "event_ended" });

    const { data: last } = await db.from("check_ins").select("*").eq("event_id", event_id).eq("undone", false).order("checked_in_at", { ascending: false }).limit(1).maybeSingle();
    if (!last) return json({ ok: false, error: "nothing_to_undo" });
    await db.from("check_ins").update({ undone: true }).eq("id", last.id);
    return json({ ok: true, undone: last });
  } catch (e) { return json({ error: String(e) }, 500); }
});
