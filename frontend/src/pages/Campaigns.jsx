import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Send, Trash2, Pencil, Clock } from "lucide-react";
import { PageShell } from "../components/Topbar";
import { StatusBadge } from "../components/StatusBadge";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    template_id: "",
    recipients_type: "all",
    recipients_value: "",
    custom_contacts: [],
    contactSearch: "",
    schedule_type: "now",
    schedule_at: "",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [campRes, tmplRes, batchRes, courseRes] = await Promise.all([
        fetch(`${API_URL}/campaigns`, { headers: authHeaders() }),
        fetch(`${API_URL}/templates`, { headers: authHeaders() }),
        fetch(`${API_URL}/contacts/distinct/batches`, { headers: authHeaders() }),
        fetch(`${API_URL}/contacts/distinct/courses`, { headers: authHeaders() }),
      ]);

      if (campRes.status === 401 || tmplRes.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (!campRes.ok) throw new Error("Failed to load campaigns");
      if (!tmplRes.ok) throw new Error("Failed to load templates");

      const campData = await campRes.json();
      const tmplData = await tmplRes.json();
      const batchData = batchRes.ok ? await batchRes.json() : { batches: [] };
      const courseData = courseRes.ok ? await courseRes.json() : { courses: [] };

      setCampaigns(campData.items);
      setTemplates(tmplData.items);
      setBatches(batchData.batches || []);
      setCourses(courseData.courses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const searchContacts = async (q) => {
    if (!q || q.length < 2) {
      setContactSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/contacts?search=${encodeURIComponent(q)}&page=1&page_size=10`,
        { headers: authHeaders() }
      );
      const data = res.ok ? await res.json() : { items: [] };
      setContactSuggestions(data.items || []);
    } catch {
      setContactSuggestions([]);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      template_id: templates[0]?.id || "",
      recipients_type: "all",
      recipients_value: "",
      custom_contacts: [],
      contactSearch: "",
      schedule_type: "now",
      schedule_at: "",
    });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      template_id: c.template.template_id || "",
      recipients_type: c.recipients.type || "all",
      recipients_value: c.recipients.type !== "custom" ? (c.recipients.value || "") : "",
      custom_contacts: c.recipients.type === "custom"
        ? (c.recipients.value || []).map((email) => ({ email, name: email, id: email }))
        : [],
      contactSearch: "",
      schedule_type: c.schedule_type,
      schedule_at: c.schedule_at ? c.schedule_at.slice(0, 16) : "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_URL}/campaigns/${editing.id}` : `${API_URL}/campaigns`;
      const method = editing ? "PATCH" : "POST";
      const payload = {
        name: form.name,
        template_id: form.template_id,
        recipients: {
          type: form.recipients_type,
          value: form.recipients_type === "all" ? null
            : form.recipients_type === "custom"
            ? (form.custom_contacts || []).map((c) => c.email)
            : form.recipients_value,
        },
        schedule_type: form.schedule_type,
        schedule_at: form.schedule_type === "scheduled" && form.schedule_at
          ? new Date(form.schedule_at).toISOString()
          : null,
      };

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Save failed");
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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
    if (!confirm(`Delete campaign "${c.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/campaigns/${c.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.detail || "Delete failed");
      }
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

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
          <Plus className="size-4" strokeWidth={2.5} />
          New Campaign
        </button>
      }
    >
      {templates.length === 0 && !loading && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-[oklch(0.5_0.12_75)] bg-accent/10 border-accent/30">
          Create a template first — campaigns need one to send from.
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-destructive bg-destructive/10 border-destructive/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-16 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Send className="size-5 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No campaigns yet</p>
          <p className="text-muted-foreground text-xs mt-1">Create your first campaign to get started</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-left">
                <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Campaign</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Audience</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Recipients</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Open</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Click</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const audienceText = c.recipients?.type === "all"
                  ? "All Contacts"
                  : c.recipients?.type === "custom"
                  ? `${Array.isArray(c.recipients?.value) ? c.recipients.value.length : 1} specific`
                  : `${c.recipients?.type === "batch" ? "Batch" : "Course"}: ${c.recipients?.value || ""}`;

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
                            {c.template?.name || "No Template"} · {c.schedule_at
                              ? new Date(c.schedule_at).toLocaleDateString()
                              : c.schedule_type === "now" ? "Immediate" : c.schedule_type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{audienceText}</td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground">
                      {c.recipients_count !== undefined ? c.recipients_count.toLocaleString() : "—"}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground text-lg">{editing ? "Edit Campaign" : "New Campaign"}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Campaign Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="July Newsletter"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Template</label>
                <select
                  required
                  value={form.template_id}
                  onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="" disabled>Select a template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipients</label>
                <div className="space-y-2">
                  <select
                    value={form.recipients_type}
                    onChange={(e) => setForm({ ...form, recipients_type: e.target.value, recipients_value: "", custom_contacts: [], contactSearch: "" })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="all">All Contacts</option>
                    <option value="batch">By Batch</option>
                    <option value="course">By Course</option>
                    <option value="custom">Specific Contacts</option>
                  </select>

                  {form.recipients_type === "batch" && (
                    <select
                      required
                      value={form.recipients_value}
                      onChange={(e) => setForm({ ...form, recipients_value: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="">Select a batch...</option>
                      {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  )}

                  {form.recipients_type === "course" && (
                    <select
                      required
                      value={form.recipients_value}
                      onChange={(e) => setForm({ ...form, recipients_value: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="">Select a course...</option>
                      {courses.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}

                  {form.recipients_type === "custom" && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search contacts by name or email..."
                        value={form.contactSearch || ""}
                        onChange={(e) => {
                          setForm({ ...form, contactSearch: e.target.value });
                          searchContacts(e.target.value);
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      />
                      {contactSuggestions.length > 0 && (
                        <div className="absolute left-0 top-11 w-full bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {contactSuggestions.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                const already = (form.custom_contacts || []).find((x) => x.id === c.id);
                                if (!already) {
                                  setForm((f) => ({
                                    ...f,
                                    custom_contacts: [...(f.custom_contacts || []), c],
                                    contactSearch: "",
                                  }));
                                }
                                setContactSuggestions([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 border-b border-border last:border-0"
                            >
                              <span className="font-medium text-foreground">{c.name}</span>
                              <span className="text-muted-foreground text-xs">{c.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {(form.custom_contacts || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {form.custom_contacts.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/15 text-xs font-medium text-foreground">
                              {c.name}
                              <button
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, custom_contacts: f.custom_contacts.filter((x) => x.id !== c.id) }))}
                                className="text-muted-foreground hover:text-destructive ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Schedule</label>
                <select
                  value={form.schedule_type}
                  onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="now">Send Immediately</option>
                  <option value="scheduled">Scheduled — one time</option>
                  <option value="recurring_monthly">Recurring — monthly</option>
                </select>
              </div>

              {form.schedule_type === "scheduled" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Send At</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.schedule_at}
                    onChange={(e) => setForm({ ...form, schedule_at: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-lg bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-60 transition"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Campaign"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}