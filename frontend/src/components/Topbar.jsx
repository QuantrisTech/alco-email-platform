import { useState, useRef, useEffect } from "react"
import { Bell, CheckCircle2, XCircle, Zap } from "lucide-react"
import { Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const NOTIF_STYLES = {
  campaign_sent: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  automation_fired: { icon: Zap, color: "text-success", bg: "bg-success/10" },
  campaign_failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  automation_failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

// PageShell wraps each page: renders the sticky top bar + main content area.
// The Sidebar is rendered once in App.jsx, so it is NOT included here.
export function PageShell({ title, description, actions, children }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const notifRef = useRef(null)

  // Close the dropdown when clicking outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch real notifications each time the dropdown opens
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setNotifications(data.items || []))
      .catch(() => {})
  }, [notifOpen])
  const navigate = useNavigate()
const [searchQuery, setSearchQuery] = useState("")
const [searchResults, setSearchResults] = useState([])
const [searchOpen, setSearchOpen] = useState(false)
const searchRef = useRef(null)

useEffect(() => {
  function handleClickOutside(e) {
    if (searchRef.current && !searchRef.current.contains(e.target)) {
      setSearchOpen(false)
    }
  }
  document.addEventListener("mousedown", handleClickOutside)
  return () => document.removeEventListener("mousedown", handleClickOutside)
}, [])

useEffect(() => {
  if (!searchQuery.trim()) {
    setSearchResults([])
    return
  }
  const token = localStorage.getItem("access_token")
  const timeout = setTimeout(() => {
    fetch(`${API_URL}/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        setSearchResults(data.items || [])
        setSearchOpen(true)
      })
      .catch(() => {})
  }, 300)
  return () => clearTimeout(timeout)
}, [searchQuery])

function goToResult(item) {
  setSearchOpen(false)
  setSearchQuery("")
  if (item.type === "contact") navigate("/contacts")
  else if (item.type === "template") navigate("/templates")
  else if (item.type === "campaign") navigate("/campaigns")
}

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex h-16 items-center gap-4 px-5 md:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground text-balance">
              {title}
            </h1>
            {description && (
              <p className="truncate text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="relative hidden md:block" ref={searchRef}>
  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
    placeholder="Search contacts, templates, campaigns…"
    className="h-9 w-64 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
  />

  {searchOpen && searchResults.length > 0 && (
    <div className="absolute left-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-30 max-h-96 overflow-y-auto">
      {searchResults.map((item) => (
        <button
          key={`${item.type}-${item.id}`}
          onClick={() => goToResult(item)}
          className="flex w-full flex-col items-start px-4 py-2.5 text-left border-b border-border last:border-0 hover:bg-muted/60 transition-colors"
        >
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.type}</span>
          <span className="text-sm font-medium text-foreground">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
        </button>
      ))}
    </div>
  )}
</div>

          <div className="relative" ref={notifRef}>
            <button
              aria-label="Notifications"
              onClick={() => setNotifOpen((o) => !o)}
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="size-[18px]" />
              {notifications.length > 0 && (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-30">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      You'll see campaign and automation updates here
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-96 overflow-y-auto">
  {notifications.map((n) => {
    const style = NOTIF_STYLES[n.type] || { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" }
    const Icon = style.icon
    return (
      <li
        key={n.id}
        className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
      >
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.color}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
        </div>
        {!n.read && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
      </li>
    )
  })}
</ul>
                )}
              </div>
            )}
          </div>

          {actions}
        </div>
      </header>

      <main className="px-5 py-6 md:px-8 md:py-8">{children}</main>
    </>
  )
}