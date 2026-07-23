import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Send,
  Zap,
  BarChart3,
  LogOut,
  Settings,
  Mail,
} from "lucide-react";
import { cn } from "../lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const nav = [
  {
    section: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Audience",
    items: [{ href: "/contacts", label: "Contacts", icon: Users }],
  },
  {
    section: "Messaging",
    items: [
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/campaigns", label: "Campaigns", icon: Send },
      { href: "/automations", label: "Automations", icon: Zap },
    ],
  },
  {
    section: "Insights",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
];

export function Sidebar() {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  // Fetch the logged-in user's profile dynamically
  useEffect(() => {
    async function fetchUserProfile() {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    }

    fetchUserProfile();
  }, []);

  // Helper to extract initials (e.g., "Ayesha Khan" -> "AK")
  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      {/* Brand */}
      <div className="flex flex-col items-center gap-1 px-6 py-5 border-b border-sidebar-border">
        <img src="/logo-white.png" alt="AL&CO" className="h-9 w-auto" />
        <p className="text-[11px] font-light tracking-wide text-sidebar-foreground/60">Email Automation</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {nav.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {group.section}
            </p>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-white"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-sidebar-primary" />
                      )}
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0 transition-colors",
                          active
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/60 group-hover:text-white",
                        )}
                      />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / user */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-white">
            {user ? getInitials(user.name || user.email) : "..."}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">
              {user ? user.name || "User" : "Loading..."}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {user ? user.email : "Connecting..."}
            </p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="rounded hover:bg-sidebar-accent/60 transition-colors p-1"
            title="Settings"
          >
            <Settings className="size-4 text-sidebar-foreground/60 hover:text-white transition-colors" />
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
        >
          <LogOut className="size-[18px]" />
          Log out
        </button>
      </div>
    </aside>
  );
}
