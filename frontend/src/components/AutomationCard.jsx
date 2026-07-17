import { useState } from "react"
import { Zap, Webhook, FileText, Pencil, Trash2, ArrowRight } from "lucide-react"
import { StatusBadge } from "./StatusBadge"
import { cn } from "../lib/utils"

export function AutomationCard({ automation }) {
  const [active, setActive] = useState(automation.active)

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/20 text-[oklch(0.5_0.12_75)]">
          <Zap className="size-5" />
        </div>
        <button
          role="switch"
          aria-checked={active}
          aria-label={`Toggle ${automation.name}`}
          onClick={() => setActive((v) => !v)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            active ? "bg-success" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
              active ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      <h3 className="mt-4 font-display text-base font-bold text-foreground">{automation.name}</h3>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Webhook className="size-4 shrink-0 text-primary/70" />
          <span className="text-xs uppercase tracking-wide">Trigger</span>
          <span className="ml-auto font-medium text-foreground">{automation.trigger}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="size-4 shrink-0 text-primary/70" />
          <span className="text-xs uppercase tracking-wide">Template</span>
          <span className="ml-auto font-medium text-foreground">{automation.template}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="font-display text-lg font-bold text-foreground">
            {automation.enrolled.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Enrolled</p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="font-display text-lg font-bold text-foreground">
            {automation.sent.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Emails sent</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <StatusBadge status={active ? "active" : "draft"} />
        <div className="flex items-center gap-1">
          <button
            aria-label={`Edit ${automation.name}`}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            aria-label={`Delete ${automation.name}`}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
          <button className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}