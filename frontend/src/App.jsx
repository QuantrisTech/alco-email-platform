import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Login from "./pages/Login";
import Contacts from './pages/Contacts'
import Templates from './pages/Templates'
import Campaigns from './pages/Campaigns'
import Automations from './pages/Automations'

const placeholder = (title) => (
  <div className="p-8 text-darktext/50 text-sm">{title} — not yet built.</div>
)

function Layout({ title, children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen">
        <Topbar title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout title="Dashboard"><Dashboard /></Layout>} />
        <Route path="/contacts" element={<Layout title="Contacts"><Contacts /></Layout>} />
        <Route path="/templates" element={<Layout title="Templates"><Templates /></Layout>} />
        <Route path="/campaigns" element={<Layout title="Campaigns"><Campaigns /></Layout>} />
        <Route path="/automations" element={<Layout title="Automations"><Automations /></Layout>} />
        <Route path="/analytics" element={<Layout title="Analytics">{placeholder('Analytics')}</Layout>} />
        <Route path="/login" element={<Login />} />
        
      </Routes>
    </BrowserRouter>
  )
}
