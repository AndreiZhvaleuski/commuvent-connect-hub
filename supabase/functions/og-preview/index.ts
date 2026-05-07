import { escape } from "jsr:@std/html";
import removeMd from "npm:remove-markdown@0.5.5";
import { admin, corsHeaders } from "../_shared/auth.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://commuvent-connect-hub.lovable.app";

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function toZonedISO(utcIso: string, timeZone: string): string {
  try {
    const date = new Date(utcIso);
    const utcParts = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzParts = new Date(date.toLocaleString("en-US", { timeZone }));
    const offsetMs = tzParts.getTime() - utcParts.getTime();
    const offsetHours = Math.floor(Math.abs(offsetMs) / 3600000);
    const offsetMins = Math.floor((Math.abs(offsetMs) % 3600000) / 60000);
    const sign = offsetMs >= 0 ? "+" : "-";
    const local = new Date(date.getTime() + offsetMs);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
      `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
      `${sign}${pad(offsetHours)}:${pad(offsetMins)}`;
  } catch {
    return new Date(utcIso).toISOString();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");

  let title = "Commuvent";
  let description = "Discover and join community events.";
  let image = "";
  let redirectPath = "/";
  let jsonLd = "";
  let ogType = "website";

  const db = admin();

  if (type === "event" && id) {
    const { data } = await db
      .from("events")
      .select("title, description, cover_image_url, start_at, end_at, time_zone, venue_address, online_url, host_id")
      .eq("id", id)
      .maybeSingle();

    if (data) {
      const isPast = new Date(data.end_at) < new Date();
      const baseDescription = data.description ? truncate(removeMd(data.description), 150) : "Community event on Commuvent.";

      title = `${data.title} · Commuvent`;
      description = isPast ? `Past event · ${baseDescription}` : baseDescription;
      image = data.cover_image_url ?? "";
      ogType = "event";

      const { data: host } = await db
        .from("hosts")
        .select("name")
        .eq("id", data.host_id)
        .maybeSingle();

      const tz = data.time_zone ?? "UTC";
      const attendanceMode = data.online_url
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode";
      const location = data.online_url
        ? { "@type": "VirtualLocation", "url": data.online_url }
        : { "@type": "Place", "name": data.venue_address ?? "TBD" };

      jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Event",
        "name": data.title,
        "description": description,
        "startDate": toZonedISO(data.start_at, tz),
        "endDate": toZonedISO(data.end_at, tz),
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": attendanceMode,
        "location": location,
        "image": image || undefined,
        "url": `${APP_URL}/e/${id}`,
        "organizer": host ? { "@type": "Organization", "name": host.name } : undefined,
      });
    }
    redirectPath = `/e/${id}`;
  } else if (type === "host" && id) {
    const { data } = await db
      .from("hosts")
      .select("name, bio, logo_url")
      .eq("id", id)
      .maybeSingle();

    if (data) {
      title = `${data.name} · Commuvent`;
      description = data.bio ? truncate(removeMd(data.bio), 160) : description;
      image = data.logo_url ?? "";

      jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": data.name,
        "description": description,
        "logo": image || undefined,
        "url": `${APP_URL}/h/${id}`,
      });
    }
    redirectPath = `/h/${id}`;
  }

  const redirectUrl = `${APP_URL}${redirectPath}`;
  const safeTitle = escape(title);
  const safeDesc = escape(description);
  const safeImage = escape(image);
  const safeRedirect = escape(redirectUrl);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${safeRedirect}">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">

  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:site_name" content="Commuvent">
  <meta property="og:url" content="${safeRedirect}">
  ${safeImage ? `<meta property="og:image" content="${safeImage}">` : ""}

  <meta name="twitter:card" content="${safeImage ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  ${safeImage ? `<meta name="twitter:image" content="${safeImage}">` : ""}

  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
