import { cn } from "../lib/utils"

const styles = {
  active: "bg-success/10 text-success ring-success/20",
  sent: "bg-success/10 text-success ring-success/20",
  unsubscribed: "bg-muted text-muted-foreground ring-border",
  bounced: "bg-destructive/10 text-destructive ring-destructive/20",
  draft: "bg-muted text-muted-foreground ring-border",
  scheduled: "bg-accent/15 text-[oklch(0.5_0.12_75)] ring-accent/30",
  sending: "bg-chart-4/10 text-chart-4 ring-chart-4/20",
}

const dot = {
  active: "bg-success",
  sent: "bg-success",
  unsubscribed: "bg-muted-foreground",
  bounced: "bg-destructive",
  draft: "bg-muted-foreground",
  scheduled: "bg-accent",
  sending: "bg-chart-4",
}

export function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        styles[status] ?? "bg-muted text-muted-foreground ring-border",
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot[status] ?? "bg-muted-foreground")} />
      {status}
    </span>
  )
}