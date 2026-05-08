// seed_demo: wipes all data + auth users + storage, then re-seeds a realistic demo dataset.
// Guarded by SEED_SECRET header. verify_jwt = false.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SEED_SECRET = Deno.env.get("SEED_SECRET")!;
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

const PASSWORD = "Password123!";

// Demo accounts (mirror src/lib/demoAccounts.ts)
const HOSTS = [
  { email: "host.alice@demo.commuvent.app", name: "Alice Chen", host: "Acme Tech Talks" },
  { email: "host.bob@demo.commuvent.app", name: "Bob Rivera", host: "Trailblazers Outdoors" },
  { email: "host.clara@demo.commuvent.app", name: "Clara Moreno", host: "Culinary Collective" },
];
const CHECKERS = [
  { email: "checker.dan@demo.commuvent.app", name: "Dan Park", hostIdx: 0 },
  { email: "checker.eve@demo.commuvent.app", name: "Eve Larsen", hostIdx: 1 },
  { email: "checker.finn@demo.commuvent.app", name: "Finn O'Hara", hostIdx: 2 },
];
const ATTENDEES = [
  { email: "att.gina@demo.commuvent.app", name: "Gina Suzuki" },
  { email: "att.henry@demo.commuvent.app", name: "Henry Adler" },
  { email: "att.ivy@demo.commuvent.app", name: "Ivy Patel" },
  { email: "att.jack@demo.commuvent.app", name: "Jack Nguyen" },
  { email: "att.kate@demo.commuvent.app", name: "Kate Müller" },
  { email: "att.liam@demo.commuvent.app", name: "Liam Walsh" },
  { email: "att.mia@demo.commuvent.app", name: "Mia Rossi" },
  { email: "att.noah@demo.commuvent.app", name: "Noah Becker" },
];

// Curated Unsplash images (free to use, hotlinked then re-uploaded to storage).
const IMG = {
  logos: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop", // tech / circuit
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop", // mountain
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop", // food
  ],
  // 3 events per host: [completed, in-progress, upcoming]
  covers: [
    // Acme Tech Talks
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&h=900&fit=crop", // AI/LLM
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1600&h=900&fit=crop", // code
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&h=900&fit=crop", // hack night
    // Trailblazers
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=900&fit=crop", // sunrise ridge
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=900&fit=crop", // forest
    "https://images.unsplash.com/photo-1454942901704-3c44c11b2ad1?w=1600&h=900&fit=crop", // autumn summit
    // Culinary
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1600&h=900&fit=crop", // pasta
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&h=900&fit=crop", // sourdough
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop", // farm-to-table
  ],
  gallery: [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&h=800&fit=crop",
  ],
};

const EVENTS_TPL = [
  // Acme Tech Talks
  { title: "Intro to LLM Agents", desc: "A hands-on intro to building autonomous LLM agents with tools and memory.", venue: "WeWork Mission, San Francisco", online: null, capacity: 60, lifecycle: "completed" },
  { title: "Live: TypeScript Performance", desc: "Profiling and optimizing TypeScript apps in production. Q&A live.", venue: null, online: "https://meet.example.com/ts-perf", capacity: 200, lifecycle: "in_progress" },
  { title: "AI Hack Night", desc: "Build something fun with the latest open models. Pizza on us.", venue: "GitHub HQ, San Francisco", online: null, capacity: 4, lifecycle: "upcoming" }, // small capacity → waitlist
  // Trailblazers Outdoors
  { title: "Sunrise Ridge Hike", desc: "5am start. Easy 6km hike to catch the sunrise from the ridge.", venue: "Eagle Trailhead, Boulder CO", online: null, capacity: 25, lifecycle: "completed" },
  { title: "Forest Trail Walk — Live", desc: "Casual midday walk through the redwoods.", venue: "Muir Woods, CA", online: null, capacity: 30, lifecycle: "in_progress" },
  { title: "Autumn Summit Climb", desc: "Full-day guided climb. All experience levels welcome.", venue: "Mt. Hood, OR", online: null, capacity: 20, lifecycle: "upcoming" },
  // Culinary Collective
  { title: "Fresh Pasta Workshop", desc: "Make tagliatelle and ravioli from scratch with chef Clara.", venue: "Studio Kitchen, Brooklyn NY", online: null, capacity: 16, lifecycle: "completed" },
  { title: "Live: Sourdough Basics", desc: "Streaming class — learn to start and bake your first loaf.", venue: null, online: "https://meet.example.com/sourdough", capacity: 100, lifecycle: "in_progress" },
  { title: "Farm-to-Table Dinner", desc: "Five-course dinner sourced from local farms.", venue: "Greenfield Farm, Hudson Valley NY", online: null, capacity: 24, lifecycle: "upcoming" },
];

function lifecycleTimes(lc: string) {
  const now = Date.now();
  const HOUR = 3600_000, DAY = 24 * HOUR;
  if (lc === "completed") return { start: new Date(now - 7 * DAY - 2 * HOUR), end: new Date(now - 7 * DAY) };
  if (lc === "in_progress") return { start: new Date(now - 1 * HOUR), end: new Date(now + 2 * HOUR) };
  return { start: new Date(now + 14 * DAY), end: new Date(now + 14 * DAY + 2 * HOUR) };
}

async function fetchImage(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} failed: ${r.status}`);
  const ct = r.headers.get("content-type") || "image/jpeg";
  return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: ct };
}

async function emptyBucket(db: any, bucket: string) {
  // recursively list and delete
  async function clearPrefix(prefix: string) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) { console.warn("list err", bucket, prefix, error.message); return; }
    if (!data || data.length === 0) return;
    const files: string[] = [];
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id == null) {
        // folder
        await clearPrefix(path);
      } else {
        files.push(path);
      }
    }
    if (files.length) {
      const { error: rmErr } = await db.storage.from(bucket).remove(files);
      if (rmErr) console.warn("remove err", bucket, rmErr.message);
    }
  }
  await clearPrefix("");
}

async function callFn(path: string, jwt: string, body: unknown) {
  const r = await fetch(`${FUNCTIONS_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  try { return { status: r.status, body: JSON.parse(txt) }; }
  catch { return { status: r.status, body: txt }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const provided = req.headers.get("x-seed-secret")?.trim();
  if (!SEED_SECRET || provided !== SEED_SECRET) {
    console.warn("seed_demo unauthorized", {
      hasSecret: Boolean(SEED_SECRET),
      providedLength: provided?.length ?? 0,
    });
    return new Response(JSON.stringify({ error: "Invalid SEED_SECRET" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const summary: Record<string, unknown> = {};

  try {
    // ---- WIPE ----
    console.log("wipe: storage");
    for (const b of ["event-covers", "host-logos", "gallery"]) await emptyBucket(db, b);

    console.log("wipe: tables");
    const tables = ["check_ins", "feedback", "gallery_photos", "notifications", "reports", "rsvps", "host_invites", "events", "host_members", "hosts", "profiles"];
    for (const t of tables) {
      const { error } = await db.from(t).delete().not("created_at", "is", null);
      // some tables (host_members) have no created_at? all listed do. fallback:
      if (error) {
        const { error: e2 } = await db.from(t).delete().gte("created_at", "1970-01-01");
        if (e2) console.warn("wipe table err", t, e2.message);
      }
    }
    // host_members: delete all
    await db.from("host_members").delete().gte("created_at", "1970-01-01");

    console.log("wipe: auth users");
    let page = 1;
    while (true) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) { console.warn("listUsers err", error.message); break; }
      const users = data?.users ?? [];
      if (users.length === 0) break;
      for (const u of users) {
        try { await db.auth.admin.deleteUser(u.id); }
        catch (e) { console.warn("deleteUser err", u.email, e); }
      }
      if (users.length < 200) break;
    }

    // ---- CREATE USERS ----
    console.log("seed: users");
    const userIds: Record<string, string> = {};
    async function makeUser(email: string, display_name: string) {
      const { data, error } = await db.auth.admin.createUser({
        email, password: PASSWORD, email_confirm: true,
        user_metadata: { display_name },
      });
      if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
      userIds[email] = data.user.id;
    }
    for (const u of [...HOSTS, ...CHECKERS, ...ATTENDEES]) await makeUser(u.email, u.name);
    summary.users = Object.keys(userIds).length;

    // ---- UPLOAD IMAGES ----
    console.log("seed: images");
    async function upload(bucket: string, path: string, srcUrl: string): Promise<string> {
      const { bytes, contentType } = await fetchImage(srcUrl);
      const { error } = await db.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
      if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
      return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }

    const logoUrls: string[] = [];
    for (let i = 0; i < HOSTS.length; i++) {
      logoUrls.push(await upload("host-logos", `host-${i}.jpg`, IMG.logos[i]));
    }

    // ---- HOSTS + MEMBERS ----
    console.log("seed: hosts");
    const hostIds: string[] = [];
    for (let i = 0; i < HOSTS.length; i++) {
      const h = HOSTS[i];
      const creator = userIds[h.email];
      const { data, error } = await db.from("hosts").insert({
        name: h.host, logo_url: logoUrls[i],
        bio: i === 0 ? "Monthly meetups for engineers building with AI and modern web stacks."
            : i === 1 ? "Group hikes, trail runs, and outdoor adventures every weekend."
            : "Hands-on cooking workshops and supper clubs celebrating local food.",
        contact_email: h.email,
        created_by: creator,
      }).select("id").single();
      if (error) throw new Error(`host insert: ${error.message}`);
      hostIds.push(data.id);
      // host membership
      await db.from("host_members").insert({ host_id: data.id, user_id: creator, role: "host" });
    }
    summary.hosts = hostIds.length;

    // checker memberships
    for (const c of CHECKERS) {
      await db.from("host_members").insert({
        host_id: hostIds[c.hostIdx], user_id: userIds[c.email], role: "checker",
      });
    }

    // ---- EVENTS ----
    console.log("seed: events");
    const events: { id: string; hostIdx: number; lifecycle: string; capacity: number }[] = [];
    for (let i = 0; i < EVENTS_TPL.length; i++) {
      const tpl = EVENTS_TPL[i];
      const hostIdx = Math.floor(i / 3);
      const { start, end } = lifecycleTimes(tpl.lifecycle);
      const coverUrl = await upload("event-covers", `event-${i}.jpg`, IMG.covers[i]);
      const { data, error } = await db.from("events").insert({
        host_id: hostIds[hostIdx],
        title: tpl.title,
        description: tpl.desc,
        venue_address: tpl.venue,
        online_url: tpl.online,
        capacity: tpl.capacity,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        time_zone: "UTC",
        visibility: "public",
        status: "published",
        cover_image_url: coverUrl,
        created_by: userIds[HOSTS[hostIdx].email],
      }).select("id").single();
      if (error) throw new Error(`event insert ${tpl.title}: ${error.message}`);
      events.push({ id: data.id, hostIdx, lifecycle: tpl.lifecycle, capacity: tpl.capacity });
    }
    summary.events = events.length;

    // ---- SIGN IN ATTENDEES + RSVP via edge function ----
    console.log("seed: rsvps");
    const attendeeJwts: Record<string, string> = {};
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    for (const a of ATTENDEES) {
      const { data, error } = await anonClient.auth.signInWithPassword({ email: a.email, password: PASSWORD });
      if (error || !data.session) { console.warn("signin", a.email, error?.message); continue; }
      attendeeJwts[a.email] = data.session.access_token;
    }

    let rsvpCount = 0;
    // every attendee RSVPs to every event (over-subscribes the small "AI Hack Night" → waitlist)
    for (const ev of events) {
      for (const a of ATTENDEES) {
        const jwt = attendeeJwts[a.email];
        if (!jwt) continue;
        const r = await callFn("rsvp_create", jwt, { event_id: ev.id });
        if (r.status === 200) rsvpCount++;
        else console.warn("rsvp", ev.id, a.email, r.status, r.body);
      }
    }
    summary.rsvps = rsvpCount;

    // ---- HOST JWTS ----
    const hostJwts: string[] = [];
    for (const h of HOSTS) {
      const { data } = await anonClient.auth.signInWithPassword({ email: h.email, password: PASSWORD });
      hostJwts.push(data?.session?.access_token ?? "");
    }

    // ---- CHECK-INS for completed + in_progress events ----
    console.log("seed: check-ins");
    let checkinCount = 0;
    for (const ev of events) {
      if (ev.lifecycle === "upcoming") continue;
      const { data: rsvps } = await db.from("rsvps").select("code, user_id").eq("event_id", ev.id).eq("status", "going").is("cancelled_at", null);
      const list = rsvps ?? [];
      // completed → check in ~80%, in_progress → ~30%
      const ratio = ev.lifecycle === "completed" ? 0.85 : 0.35;
      const target = Math.max(1, Math.floor(list.length * ratio));
      const jwt = hostJwts[ev.hostIdx];
      if (!jwt) continue;
      for (let i = 0; i < target && i < list.length; i++) {
        const r = await callFn("check_in_by_code", jwt, { event_id: ev.id, code: list[i].code });
        if (r.status === 200) checkinCount++;
      }
    }
    summary.checkins = checkinCount;

    // ---- FEEDBACK + GALLERY for completed events ----
    console.log("seed: feedback + gallery");
    let feedbackCount = 0, photoCount = 0;
    const feedbackComments = [
      "Loved it! Great energy and learned a ton.",
      "Well organized, will come again.",
      "Excellent host and venue. Top notch.",
      "Fantastic — exceeded expectations.",
    ];
    for (const ev of events) {
      if (ev.lifecycle !== "completed") continue;
      const { data: rsvps } = await db.from("rsvps").select("user_id").eq("event_id", ev.id).eq("status", "going").is("cancelled_at", null).limit(3);
      const attendeeUserIds = (rsvps ?? []).map(r => r.user_id);
      // feedback
      for (let i = 0; i < Math.min(2, attendeeUserIds.length); i++) {
        const { error } = await db.from("feedback").insert({
          event_id: ev.id, user_id: attendeeUserIds[i],
          rating: 4 + (i % 2),
          comment: feedbackComments[(ev.hostIdx + i) % feedbackComments.length],
        });
        if (!error) feedbackCount++;
      }
      // gallery — upload 2 photos, then approve them
      for (let i = 0; i < 2 && i < attendeeUserIds.length; i++) {
        const srcIdx = (ev.hostIdx * 2 + i) % IMG.gallery.length;
        const path = `event-${ev.id}/photo-${i}.jpg`;
        try {
          await upload("gallery", path, IMG.gallery[srcIdx]);
        } catch (e) { console.warn("gallery upload", e); continue; }
        const { data: row, error } = await db.from("gallery_photos").insert({
          event_id: ev.id, user_id: attendeeUserIds[i], storage_path: path,
        }).select("id").single();
        if (error || !row) { console.warn("gallery insert", error?.message); continue; }
        // trigger forced 'pending' → flip to approved
        await db.from("gallery_photos").update({ status: "approved" }).eq("id", row.id);
        photoCount++;
      }
    }
    summary.feedback = feedbackCount;
    summary.photos = photoCount;

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed_demo error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e), summary }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
