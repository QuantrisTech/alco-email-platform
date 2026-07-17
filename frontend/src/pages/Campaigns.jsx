import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Send, Trash2, Pencil, Clock } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const STATUS_STYLES = {
  draft: "bg-lightgray text-darktext/60",
  scheduled: "bg-gold/20 text-gold-alt",
  sending: "bg-navy-lighter/15 text-navy-lighter",
  sent: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger",
};

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    template_id: "",
    recipients_type: "all",
    recipients_value: "",
    schedule_type: "now",
    schedule_at: "",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [campRes, tmplRes] = await Promise.all([
        fetch(`${API_URL}/campaigns`, { headers: authHeaders() }),
        fetch(`${API_URL}/templates`, { headers: authHeaders() }),
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
      setCampaigns(campData.items);
      setTemplates(tmplData.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      template_id: templates[0]?.id || "",
      recipients_type: "all",
      recipients_value: "",
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
      recipients_value: c.recipients.value || "",
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
          value: form.recipients_type === "all" ? null : form.recipients_value,
        },
        schedule_type: form.schedule_type,
        schedule_at: form.schedule_type === "scheduled" && form.schedule_at ? form.schedule_at : null,
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
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-darktext/50">
          Sending is not yet enabled — campaigns can be created and scheduled as drafts.
        </p>
        <button
          onClick={openCreate}
          disabled={templates.length === 0}
          className="flex items-center gap-2 bg-gold hover:bg-gold-alt text-navy font-semibold text-sm px-4 py-2.5 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Campaign
        </button>
      </div>

      {templates.length === 0 && !loading && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-gold-alt bg-gold/10 border-gold/30">
          Create a template first — campaigns need one to send from.
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-danger bg-red-50 border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-darktext/40">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-border py-16 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-lightgray flex items-center justify-center mb-3">
            <Send size={20} className="text-darktext/30" />
          </div>
          <p className="text-darktext/70 font-medium">No campaigns yet</p>
          <p className="text-darktext/40 text-xs mt-1">Create your first campaign to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-lightgray/60 border-b border-border text-left">
                <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Campaign</th>
                <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Template</th>
                <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Recipients</th>
                <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Schedule</th>
                <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-lightgray/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-darktext">{c.name}</td>
                  <td className="px-5 py-3.5 text-darktext/70">{c.template.name || "—"}</td>
                  <td className="px-5 py-3.5 text-darktext/70 capitalize">
                    {c.recipients.type}
                    {c.recipients.value ? `: ${c.recipients.value}` : ""}
                  </td>
                  <td className="px-5 py-3.5 text-darktext/70">
                    {c.schedule_type === "now" ? (
                      "Immediate"
                    ) : c.schedule_at ? (
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-darktext/40" />
                        {new Date(c.schedule_at).toLocaleString()}
                      </span>
                    ) : (
                      c.schedule_type
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[c.status] || ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {(c.status === "draft" || c.status === "scheduled") && (
                      <button
                        onClick={() => openEdit(c)}
                        className="text-darktext/40 hover:text-navy hover:bg-lightgray p-1.5 rounded-md transition"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-darktext/40 hover:text-danger hover:bg-red-50 p-1.5 rounded-md transition ml-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-navy/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy text-lg">{editing ? "Edit Campaign" : "New Campaign"}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-darktext/40 hover:text-darktext hover:bg-lightgray p-1 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Campaign Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  placeholder="July Newsletter"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Template</label>
                <select
                  required
                  value={form.template_id}
                  onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                >
                  <option value="" disabled>Select a template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Recipients</label>
                <div className="flex gap-2">
                  <select
                    value={form.recipients_type}
                    onChange={(e) => setForm({ ...form, recipients_type: e.target.value, recipients_value: "" })}
                    className="w-32 px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  >
                    <option value="all">All</option>
                    <option value="batch">Batch</option>
                    <option value="course">Course</option>
                  </select>
                  {form.recipients_type !== "all" && (
                    <input
                      required
                      value={form.recipients_value}
                      onChange={(e) => setForm({ ...form, recipients_value: e.target.value })}
                      placeholder={form.recipients_type === "batch" ? "e.g. 2026-A" : "e.g. Email Automation"}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Schedule</label>
                <select
                  value={form.schedule_type}
                  onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                >
                  <option value="now">Send Immediately (once sending is enabled)</option>
                  <option value="scheduled">Scheduled — one time</option>
                  <option value="recurring_monthly">Recurring — monthly</option>
                </select>
              </div>

              {form.schedule_type === "scheduled" && (
                <div>
                  <label className="block text-xs font-medium text-navy-light mb-1.5">Send At</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.schedule_at}
                    onChange={(e) => setForm({ ...form, schedule_at: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gold hover:bg-gold-alt text-navy font-semibold py-3 rounded-lg text-sm mt-2 disabled:opacity-60 transition shadow-sm"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Campaign"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}