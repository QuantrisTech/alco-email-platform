import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "../lib/utils"

export function StatCard({ label, value, sub, icon: Icon, href, trend, tone = "default" }) {
  const iconTone = {
    default: "bg-primary/10 text-primary",
    gold: "bg-accent/20 text-[oklch(0.5_0.12_75)]",
    green: "bg-success/10 text-success",
  }[tone]

  const body = (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={cn("flex size-11 items-center justify-center rounded-xl", iconTone)}>
          <Icon className="size-5" />
        </div>
        {href && (
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        )}
      </div>
      <p className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trend.up ? "text-success" : "text-destructive",
            )}
          >
            {trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend.value}
          </span>
        )}
      </div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )

  return href ? <Link to={href}>{body}</Link> : body
}