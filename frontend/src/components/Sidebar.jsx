import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Send, Zap, BarChart3 } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/campaigns', label: 'Campaigns', icon: Send },
  { to: '/automations', label: 'Automations', icon: Zap },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-navy min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-white font-semibold text-lg tracking-tight">
          AL<span className="text-gold">&</span>CO
        </span>
        <p className="text-white/50 text-xs mt-0.5">Email Automation</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border-l-2 ${
                isActive
                  ? 'bg-white/5 text-white border-gold'
                  : 'text-white/60 border-transparent hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
