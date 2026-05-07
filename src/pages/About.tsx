import { DownloadSimpleIcon as Download } from "@phosphor-icons/react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCsv, downloadBlob, EXAMPLE_RSVP_ROWS } from "@/lib/csv";

export default function About() {
  function downloadExample() {
    const blob = buildCsv(EXAMPLE_RSVP_ROWS);
    downloadBlob(blob, "commuvent-rsvps-example.csv");
  }

  return (
    <AppLayout>
      <main className="container max-w-3xl py-12 space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">About Commuvent</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Where community meets event. Publish free events, collect RSVPs, run
            check-in at the door, and share the gallery afterwards.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Example CSV export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hosts can export RSVPs from any event. Files are UTF-8 with BOM so
              Excel and Google Sheets render non-ASCII names correctly. Times use
              ISO 8601 in the event's time zone.
            </p>
            <div className="rounded-md border bg-muted/40 p-3 overflow-x-auto">
              <pre className="text-xs leading-relaxed">
{`name,email,rsvp_status,check_in_time
Amélie Dupont,amelie@example.com,going,2026-06-12T19:04:31+02:00
佐藤健,ken.sato@example.com,going,2026-06-12T19:07:02+02:00
María José Núñez,mj.nunez@example.com,going,
Øyvind Hansen,oyvind@example.com,waitlist,
Иван Петров,ivan.petrov@example.com,going,2026-06-12T19:21:45+02:00`}
              </pre>
            </div>
            <Button onClick={downloadExample}>
              <Download className="w-4 h-4 mr-2" /> Download example CSV
            </Button>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
