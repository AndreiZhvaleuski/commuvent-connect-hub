import { useEffect, useState } from "react";
import { StarIcon as Star } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Feedback = { id: string; rating: number; comment: string | null; user_id: string; created_at: string };

export function EventFeedback({ eventId, eventEnded }: { eventId: string; eventEnded: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Feedback[]>([]);
  const [mine, setMine] = useState<Feedback | null>(null);
  const [attended, setAttended] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("id,rating,comment,user_id,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const all = (data ?? []) as Feedback[];
    setItems(all);
    setMine(user ? all.find((f) => f.user_id === user.id) ?? null : null);

    if (user) {
      const { data: ci } = await supabase
        .from("check_ins")
        .select("id, rsvps!inner(user_id)")
        .eq("event_id", eventId)
        .eq("undone", false)
        .eq("rsvps.user_id", user.id)
        .limit(1);
      setAttended((ci ?? []).length > 0);
    } else {
      setAttended(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId, user?.id]);

  const submit = async () => {
    if (!user) return;
    if (rating < 1) { toast.error("Pick a rating"); return; }
    setBusy(true);
    const trimmed = comment.trim();
    if (trimmed.length > 1000) { toast.error("Comment must be 1000 characters or less."); return; }
    const { error } = await supabase.from("feedback").insert({
      event_id: eventId, user_id: user.id, rating, comment: trimmed || null,
    });
    setBusy(false);
    if (error) {
      const code = (error as { code?: string }).code;
      const msg = error.message || "";
      if (code === "23505") {
        toast.error("You've already submitted feedback for this event.");
        load();
      } else if (code === "23514" && /comment/i.test(msg)) {
        toast.error("Comment must be 1000 characters or less.");
      } else if (code === "23514" && /rating/i.test(msg)) {
        toast.error("Rating must be between 1 and 5 stars.");
      } else {
        toast.error(msg || "Could not submit feedback.");
      }
      return;
    }
    toast.success("Thanks for your feedback!");
    setRating(0); setComment("");
    load();
  };

  const avg = items.length ? (items.reduce((s, f) => s + f.rating, 0) / items.length).toFixed(1) : null;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Feedback</span>
          {avg && <span className="text-sm font-normal text-muted-foreground">★ {avg} · {items.length}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user ? (
          <p className="text-sm text-muted-foreground">Sign in to leave feedback.</p>
        ) : !eventEnded ? (
          <p className="text-sm text-muted-foreground">Feedback opens after the event ends.</p>
        ) : !attended ? (
          <p className="text-sm text-muted-foreground">Only attendees who checked in can leave feedback.</p>
        ) : mine ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < mine.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              ))}
            </div>
            {mine.comment && <p className="mt-2 whitespace-pre-line">{mine.comment}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Your feedback · already submitted</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Star className={`h-6 w-6 ${(hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            <Button onClick={submit} disabled={busy || rating < 1}>Submit feedback</Button>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3 pt-2">
            {items.filter((f) => !mine || f.id !== mine.id).map((f) => (
              <div key={f.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < f.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  ))}
                </div>
                {f.comment && <p className="mt-1.5 whitespace-pre-line text-muted-foreground">{f.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
