import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  ConfettiIcon,
  GlobeIcon,
  HandHeartIcon,
  HeartIcon,
  LightningIcon,
  SparkleIcon,
  TicketIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Communities", value: "1,248", icon: UsersThreeIcon },
  { label: "Events hosted", value: "9,372", icon: CalendarBlankIcon },
  { label: "RSVPs collected", value: "184k", icon: TicketIcon },
  { label: "Cities", value: "63", icon: GlobeIcon },
];

const values = [
  {
    icon: HeartIcon,
    title: "Free, forever",
    body: "No ticket fees, no paywalled features. Community shouldn't cost a subscription.",
  },
  {
    icon: LightningIcon,
    title: "Built for the door",
    body: "Check-in works on a phone, in a basement, with bad WiFi. We tested it there.",
  },
  {
    icon: HandHeartIcon,
    title: "Hosts first",
    body: "Tools shaped by real organizers — book clubs, run crews, hackerspaces, choirs.",
  },
];

const milestones = [
  { year: "2023", title: "Kitchen-table prototype", body: "A spreadsheet for a 40-person poetry night turns into a weekend project." },
  { year: "2024", title: "First 100 hosts", body: "Local run clubs, repair cafés and language meetups join the beta." },
  { year: "2025", title: "Check-in goes offline", body: "QR door scanning ships. Works without signal at warehouse parties." },
  { year: "2026", title: "9,000+ events", body: "Communities across 63 cities use Commuvent every week." },
];

const team = [
  { name: "Amélie Dupont", role: "Co-founder, Product", seed: "amelie" },
  { name: "Kenji Sato", role: "Co-founder, Engineering", seed: "kenji" },
  { name: "María José Núñez", role: "Community", seed: "maria" },
  { name: "Øyvind Hansen", role: "Design", seed: "oyvind" },
];

export default function About() {
  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <Badge variant="secondary" className="mb-5">
            <SparkleIcon className="mr-1 h-3.5 w-3.5" />
            Our story
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl">
            We build the boring plumbing so communities can throw{" "}
            <span className="text-primary">unforgettable nights.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Commuvent started as a single shared spreadsheet at a poetry reading
            in 2023. Today it powers thousands of free events — from dawn run
            clubs in Lisbon to late-night board game nights in Osaka.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link to="/explore" />} size="lg">
              Explore events <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
            <Button render={<Link to="/become-a-host" />} size="lg" variant="outline">
              Become a host
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="pt-6">
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="mt-3 text-3xl font-semibold tracking-tight">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">What we believe</h2>
          <p className="text-muted-foreground mt-1">Three rules we won't break.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <Card key={v.title}>
                <CardContent className="pt-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">A short timeline</h2>
          <p className="text-muted-foreground mt-1">From spreadsheet to door scanner.</p>
        </div>
        <ol className="relative border-l ml-3 space-y-8">
          {milestones.map((m) => (
            <li key={m.year} className="pl-6">
              <span className="absolute -left-[7px] mt-1.5 inline-flex h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-background" />
              <div className="text-sm text-muted-foreground font-mono">{m.year}</div>
              <div className="mt-1 font-semibold">{m.title}</div>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">{m.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">The tiny team</h2>
          <p className="text-muted-foreground mt-1">Four people, way too much coffee.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m) => (
            <Card key={m.name}>
              <CardContent className="pt-6 flex items-center gap-3">
                <img
                  src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${m.seed}`}
                  alt={m.name}
                  className="h-12 w-12 rounded-full bg-muted"
                  loading="lazy"
                />
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 pb-20">
        <Card className="overflow-hidden">
          <CardContent className="pt-8 pb-8 text-center">
            <ConfettiIcon className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Throw something worth showing up to.
            </h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
              Set up a host page in under two minutes. We'll handle the RSVPs,
              the door, and the gallery.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button render={<Link to="/become-a-host" />} size="lg">
                Become a host <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
              <Button render={<Link to="/explore" />} size="lg" variant="outline">
                Browse events
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
