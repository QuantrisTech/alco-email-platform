import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, X, Zap, Trash2, Pencil } from "lucide-react"
import { PageShell } from "../components/Topbar"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

function authHeaders() {
  const token = localStorage.getItem("access_token")
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

const TRIGGER_LABELS = {
  new_contact_webhook: "New Contact (Webhook)",
  schedule: "Scheduled",
  manual: "Manual",
}

export default function Automations() {
  const navigate = useNavigate()
  const [automations, setAutomations] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: "",
    trigger_type: "manual",
    trigger_config_value: "",
    template_id: "",
    is_active: false,
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [autoRes, tmplRes] = await Promise.all([
        fetch(`${API_URL}/automations`, { headers: authHeaders() }),
        fetch(`${API_URL}/templates`, { headers: authHeaders() }),
      ])

      if (autoRes.status === 401 || tmplRes.status === 401) {
        localStorage.removeItem("access_token")
        navigate("/login")
        return
      }
      if (!autoRes.ok) throw new Error("Failed to load automations")
      if (!tmplRes.ok) throw new Error("Failed to load templates")

      const autoData = await autoRes.json()
      const tmplData = await tmplRes.json()
      setAutomations(autoData.items || [])
      setTemplates(tmplData.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const openCreate = () => {
    setEditing(null)
    setForm({ 
      name: "", 
      trigger_type: "manual", 
      trigger_config_value: "", 
      template_id: templates[0]?.id || "", 
      is_active: false 
    })
    setModalOpen(true)
  }

  const openEdit = (a) => {
    setEditing(a)
    let configValue = ""
    if (a.trigger_type === "schedule" && a.trigger_config?.day_of_month) {
      configValue = String(a.trigger_config.day_of_month)
    } else if (a.trigger_config?.inactive_days) {
      configValue = String(a.trigger_config.inactive_days)
    }
    setForm({
      name: a.name,
      trigger_type: a.trigger_type,
      trigger_config_value: configValue,
      template_id: a.template?.template_id || a.template_id || "",
      is_active: a.is_active,
    })
    setModalOpen(true)
  }

  const buildTriggerConfig = () => {
    if (form.trigger_type === "schedule" && form.trigger_config_value) {
      return { day_of_month: parseInt(form.trigger_config_value, 10) }
    }
    if (form.trigger_type === "new_contact_webhook" && form.trigger_config_value) {
      return { inactive_days: parseInt(form.trigger_config_value, 10) }
    }
    return {}
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = editing ? `${API_URL}/automations/${editing.id}` : `${API_URL}/automations`
      const method = editing ? "PATCH" : "POST"
      const payload = {
        name: form.name,
        trigger_type: form.trigger_type,
        trigger_config: buildTriggerConfig(),
        template_id: form.template_id,
        is_active: form.is_active,
      }

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Save failed")
      }
      setModalOpen(false)
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (a) => {
    try {
      const res = await fetch(`${API_URL}/automations/${a.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ is_active: !a.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      fetchAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (a) => {
    if (!confirm(`Delete automation "${a.name}"? This can't be undone.`)) return
    try {
      const res = await fetch(`${API_URL}/automations/${a.id}`, { method: "DELETE", headers: authHeaders() })
      if (!res.ok && res.status !== 204) throw new Error("Delete failed")
      fetchAll()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <PageShell
      title="Automations"
      description="Trigger-based email flows that run on autopilot."
      actions={
        <button
          onClick={openCreate}
          disabled={templates.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="size-4" /> New Automation
        </button>
      }
    >
      {/* Informative Warning Banner */}
      {templates.length === 0 && !loading && (
        <div className="mb-4 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          Create a template first — automations need one to send from.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Grid Canvas Area */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading automation maps...
          </div>
        </div>
      ) : automations.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Zap className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No automations yet</p>
            <p className="text-sm text-muted-foreground">Create your first automated flow to begin tracking.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {automations.map((a) => (
            <div key={a.id} className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-base tracking-tight">{a.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TRIGGER_LABELS[a.trigger_type] || a.trigger_type}
                  </p>
                </div>
                {/* Modern Toggle Switch */}
                <button
                  onClick={() => toggleActive(a)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
                    a.is_active ? "bg-success" : "bg-muted"
                  }`}
                  title={a.is_active ? "Active — click to pause" : "Paused — click to activate"}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      a.is_active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1 mb-5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Template</span>
                <p className="text-sm font-medium text-foreground/80 truncate">{a.template?.name || "—"}</p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    a.is_active 
                      ? "bg-success/10 text-success" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {a.is_active ? "Active" : "Paused"}
                </span>
                <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(a)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Edit flow"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete flow"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configuration Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground text-lg">{editing ? "Edit Automation" : "New Automation"}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Automation Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                  placeholder="Welcome New Contacts"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Trigger Block</label>
                <select
                  value={form.trigger_type}
                  onChange={(e) => setForm({ ...form, trigger_type: e.target.value, trigger_config_value: "" })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                >
                  <option value="manual">Manual</option>
                  <option value="new_contact_webhook">New Contact (Webhook)</option>
                  <option value="schedule">Scheduled</option>
                </select>
              </div>

              {form.trigger_type === "schedule" && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Day of Month</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="28"
                    value={form.trigger_config_value}
                    onChange={(e) => setForm({ ...form, trigger_config_value: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                    placeholder="1"
                  />
                </div>
              )}

              {form.trigger_type === "new_contact_webhook" && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Inactive Days <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.trigger_config_value}
                    onChange={(e) => setForm({ ...form, trigger_config_value: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                    placeholder="7"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Dispatch Template</label>
                <select
                  required
                  value={form.template_id}
                  onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                >
                  <option value="" disabled>Select a template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="size-4 rounded border-border text-accent focus:ring-accent/30 bg-background"
                  />
                  Activate layout immediately
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 inline-flex items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:brightness-95 disabled:opacity-60 mt-2"
              >
                {saving ? "Saving Changes..." : editing ? "Save Automation Changes" : "Create Core Automation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}