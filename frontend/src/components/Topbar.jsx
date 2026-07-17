import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"

// PageShell wraps each page: renders the sticky top bar + main content area.
// The Sidebar is rendered once in App.jsx, so it is NOT included here.
export function PageShell({ title, description, actions, children }) {
  const [notifOpen, setNotifOpen] = useState(false)
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

  // Real notifications will be fetched from a backend endpoint once one
  // exists (e.g. GET /notifications). Empty for now — deliberately not
  // faking data here.
  const notifications = []

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
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id} className="px-4 py-3 border-b border-border last:border-0 text-sm">
                        {n.message}
                      </li>
                    ))}
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