import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Send, Pencil, MoreHorizontal, X, Trash2 } from "lucide-react"
import { PageShell } from "../components/Topbar"
import { StatusBadge } from "../components/StatusBadge"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

function authHeaders() {
  const token = localStorage.getItem("access_token")
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: "",
    template_id: "",
    recipients_type: "all",
    recipients_value: "",
    schedule_type: "now",
    schedule_at: "",
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [campRes, tmplRes] = await Promise.all([
        fetch(`${API_URL}/campaigns`, { headers: authHeaders() }),
        fetch(`${API_URL}/templates`, { headers: authHeaders() }),
      ])

      if (campRes.status === 401 || tmplRes.status === 401) {
        localStorage.removeItem("access_token")
        navigate("/login")
        return
      }
      if (!campRes.ok) throw new Error("Failed to load campaigns")
      if (!tmplRes.ok) throw new Error("Failed to load templates")

      const campData = await campRes.json()
      const tmplData = await tmplRes.json()
      setCampaigns(campData.items || [])
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
      template_id: templates[0]?.id || "",
      recipients_type: "all",
      recipients_value: "",
      schedule_type: "now",
      schedule_at: "",
    })
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name,
      template_id: c.template?.template_id || c.template_id || "",
      recipients_type: c.recipients?.type || "all",
      recipients_value: c.recipients?.value || "",
      schedule_type: c.schedule_type,
      schedule_at: c.schedule_at ? c.schedule_at.slice(0, 16) : "",
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = editing ? `${API_URL}/campaigns/${editing.id}` : `${API_URL}/campaigns`
      const method = editing ? "PATCH" : "POST"
      const payload = {
        name: form.name,
        template_id: form.template_id,
        recipients: {
          type: form.recipients_type,
          value: form.recipients_type === "all" ? null : form.recipients_value,
        },
        schedule_type: form.schedule_type,
        schedule_at: form.schedule_type === "scheduled" && form.schedule_at ? form.schedule_at : null,
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

  const [sendingId, setSendingId] = useState(null);

const handleSend = async (c) => {
  if (!confirm(`Send "${c.name}" now? This will email real recipients.`)) return;
  setSendingId(c.id);
  setError("");
  try {
    const res = await fetch(`${API_URL}/campaigns/${c.id}/send`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Send failed");

    alert(`Sent: ${data.sent}, Failed: ${data.failed}, Total: ${data.total_recipients}`);
    fetchAll();
  } catch (err) {
    setError(err.message);
  } finally {
    setSendingId(null);
  }
};


  const handleDelete = async (c) => {
    if (!confirm(`Delete campaign "${c.name}"? This can't be undone.`)) return
    try {
      const res = await fetch(`${API_URL}/campaigns/${c.id}`, { method: "DELETE", headers: authHeaders() })
      if (!res.ok && res.status !== 204) {
        const data = await res.json()
        throw new Error(data.detail || "Delete failed")
      }
      fetchAll()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <PageShell
      title="Campaigns"
      description="Create, schedule and track your email campaigns."
      actions={
        <button
          onClick={openCreate}
          disabled={templates.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="size-4" /> New Campaign
        </button>
      }
    >
      {/* Messages */}
      {templates.length === 0 && !loading && (
        <div className="mb-4 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          Create a template first — campaigns need one to send from.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Main Grid Card Content */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Campaign</th>
                <th className="px-5 py-3 font-semibold">Audience</th>
                <th className="px-5 py-3 font-semibold">Recipients</th>
                <th className="px-5 py-3 font-semibold">Open</th>
                <th className="px-5 py-3 font-semibold">Click</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading campaigns backend records...
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Send className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No campaigns yet</p>
                      <p className="text-sm text-muted-foreground">Create your first campaign to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const audienceText = c.recipients?.type === "all" 
                    ? "All Contacts" 
                    : `${c.recipients?.type || "—"}${c.recipients?.value ? `: ${c.recipients.value}` : ""}`;
                  
                  return (
                    <tr key={c.id} className="group transition-colors hover:bg-muted/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Send className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.template?.name || "No Template"} · {c.schedule_at ? new Date(c.schedule_at).toLocaleDateString() : (c.schedule_type === 'now' ? "Immediate" : c.schedule_type)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground capitalize">{audienceText}</td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">
                        {c.recipients_count !== undefined ? c.recipients_count.toLocaleString() : (c.recipients?.type === "all" ? "All" : "—")}
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground">
                        {c.openRate !== undefined && c.openRate !== null ? `${c.openRate}%` : "—"}
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground">
                        {c.clickRate !== undefined && c.clickRate !== null ? `${c.clickRate}%` : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                          {(c.status === "draft" || c.status === "scheduled") && (
                            <button
                              onClick={() => handleSend(c)}
                              disabled={sendingId === c.id}
                              aria-label={`Send ${c.name}`}
                              className="flex size-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                            >
                              <Send className="size-4" />
                            </button>
                          )}
                          {(c.status === "draft" || c.status === "scheduled") && (
                            <button
                              onClick={() => openEdit(c)}
                              aria-label={`Edit ${c.name}`}
                              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c)}
                            aria-label={`Delete ${c.name}`}
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern UI Dialog Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground text-lg">{editing ? "Edit Campaign" : "New Campaign"}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Campaign Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                  placeholder="July Newsletter"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Template</label>
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recipients Target</label>
                <div className="flex gap-2">
                  <select
                    value={form.recipients_type}
                    onChange={(e) => setForm({ ...form, recipients_type: e.target.value, recipients_value: "" })}
                    className="h-10 w-32 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                  >
                    <option value="all">All Contacts</option>
                    <option value="batch">Batch</option>
                    <option value="course">Course</option>
                  </select>
                  {form.recipients_type !== "all" && (
                    <input
                      required
                      value={form.recipients_value}
                      onChange={(e) => setForm({ ...form, recipients_value: e.target.value })}
                      placeholder={form.recipients_type === "batch" ? "e.g. 2026-A" : "e.g. Email Automation"}
                      className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Schedule Options</label>
                <select
                  value={form.schedule_type}
                  onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                >
                  <option value="now">Send Immediately</option>
                  <option value="scheduled">Scheduled — one time</option>
                  <option value="recurring_monthly">Recurring — monthly</option>
                </select>
              </div>

              {form.schedule_type === "scheduled" && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Send At</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.schedule_at}
                    onChange={(e) => setForm({ ...form, schedule_at: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 inline-flex items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:brightness-95 disabled:opacity-60"
              >
                {saving ? "Saving Data..." : editing ? "Save Campaign Details" : "Create Dynamic Campaign"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}