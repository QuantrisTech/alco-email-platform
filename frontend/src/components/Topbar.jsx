import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ title }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-8">
      <h1 className="text-darktext font-semibold text-lg">{title}</h1>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm text-darktext/70 hover:text-danger transition-colors"
      >
        <LogOut size={16} />
        Log out
      </button>
    </header>
  )
}