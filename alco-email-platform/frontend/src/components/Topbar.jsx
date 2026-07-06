import { LogOut } from 'lucide-react'

export default function Topbar({ title }) {
  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-8">
      <h1 className="text-darktext font-semibold text-lg">{title}</h1>
      <button className="flex items-center gap-2 text-sm text-darktext/70 hover:text-danger transition-colors">
        <LogOut size={16} />
        Log out
      </button>
    </header>
  )
}
