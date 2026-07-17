import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Zap, Trash2, Pencil } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const TRIGGER_LABELS = {
  new_contact_webhook: "New Contact (Webhook)",
  schedule: "Scheduled",
  manual: "Manual",
};

export default function Automations() {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger_type: "manual",
    trigger_config_value: "",
    template_id: "",
    is_active: false,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [autoRes, tmplRes] = await Promise.all([
        fetch(`${API_URL}/automations`, { headers: authHeaders() }),
        fetch(`${API_URL}/templates`, { headers: authHeaders() }),
      ]);

      if (autoRes.status === 401 || tmplRes.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }
      if (!autoRes.ok) throw new Error("Failed to load automations");
      if (!tmplRes.ok) throw new Error("Failed to load templates");

      setAutomations((await autoRes.json()).items);
      setTemplates((await tmplRes.json()).items);
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
    setForm({ name: "", trigger_type: "manual", trigger_config_value: "", template_id: templates[0]?.id || "", is_active: false });
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    let configValue = "";
    if (a.trigger_type === "schedule" && a.trigger_config?.day_of_month) {
      configValue = String(a.trigger_config.day_of_month);
    } else if (a.trigger_config?.inactive_days) {
      configValue = String(a.trigger_config.inactive_days);
    }
    setForm({
      name: a.name,
      trigger_type: a.trigger_type,
      trigger_config_value: configValue,
      template_id: a.template.template_id || "",
      is_active: a.is_active,
    });
    setModalOpen(true);
  };

  const buildTriggerConfig = () => {
    if (form.trigger_type === "schedule" && form.trigger_config_value) {
      return { day_of_month: parseInt(form.trigger_config_value, 10) };
    }
    if (form.trigger_type === "new_contact_webhook" && form.trigger_config_value) {
      return { inactive_days: parseInt(form.trigger_config_value, 10) };
    }
    return {};
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_URL}/automations/${editing.id}` : `${API_URL}/automations`;
      const method = editing ? "PATCH" : "POST";
      const payload = {
        name: form.name,
        trigger_type: form.trigger_type,
        trigger_config: buildTriggerConfig(),
        template_id: form.template_id,
        is_active: form.is_active,
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

  const toggleActive = async (a) => {
    try {
      const res = await fetch(`${API_URL}/automations/${a.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ is_active: !a.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Delete automation "${a.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/automations/${a.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-darktext/50">
          Automations can be configured here, but triggers do not fire automatically yet.
        </p>
        <button
          onClick={openCreate}
          disabled={templates.length === 0}
          className="flex items-center gap-2 bg-gold hover:bg-gold-alt text-navy font-semibold text-sm px-4 py-2.5 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Automation
        </button>
      </div>

      {templates.length === 0 && !loading && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-gold-alt bg-gold/10 border-gold/30">
          Create a template first — automations need one to send from.
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-danger bg-red-50 border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-darktext/40">Loading automations...</div>
      ) : automations.length === 0 ? (
        <div className="bg-white rounded-xl border border-border py-16 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-lightgray flex items-center justify-center mb-3">
            <Zap size={20} className="text-darktext/30" />
          </div>
          <p className="text-darktext/70 font-medium">No automations yet</p>
          <p className="text-darktext/40 text-xs mt-1">Create your first automation to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {automations.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-navy">{a.name}</h3>
                  <p className="text-xs text-darktext/50 mt-0.5">{TRIGGER_LABELS[a.trigger_type] || a.trigger_type}</p>
                </div>
                <button
                  onClick={() => toggleActive(a)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${a.is_active ? "bg-success" : "bg-border"}`}
                  style={{ height: "22px" }}
                  title={a.is_active ? "Active — click to pause" : "Paused — click to activate"}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${a.is_active ? "translate-x-[22px]" : "translate-x-0.5"}`}
                  />
                </button>
              </div>

              <p className="text-xs text-darktext/40 mb-1">Template</p>
              <p className="text-sm text-darktext/70 mb-3">{a.template.name || "—"}</p>

              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    a.is_active ? "bg-success/10 text-success" : "bg-lightgray text-darktext/50"
                  }`}
                >
                  {a.is_active ? "Active" : "Paused"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="text-darktext/40 hover:text-navy hover:bg-lightgray p-1.5 rounded-md transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="text-darktext/40 hover:text-danger hover:bg-red-50 p-1.5 rounded-md transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-navy/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy text-lg">{editing ? "Edit Automation" : "New Automation"}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-darktext/40 hover:text-darktext hover:bg-lightgray p-1 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Automation Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  placeholder="Welcome New Contacts"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Trigger</label>
                <select
                  value={form.trigger_type}
                  onChange={(e) => setForm({ ...form, trigger_type: e.target.value, trigger_config_value: "" })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                >
                  <option value="manual">Manual</option>
                  <option value="new_contact_webhook">New Contact (Webhook)</option>
                  <option value="schedule">Scheduled</option>
                </select>
              </div>

              {form.trigger_type === "schedule" && (
                <div>
                  <label className="block text-xs font-medium text-navy-light mb-1.5">Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={form.trigger_config_value}
                    onChange={(e) => setForm({ ...form, trigger_config_value: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                    placeholder="1"
                  />
                </div>
              )}

              {form.trigger_type === "new_contact_webhook" && (
                <div>
                  <label className="block text-xs font-medium text-navy-light mb-1.5">
                    Inactive Days <span className="text-darktext/40 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.trigger_config_value}
                    onChange={(e) => setForm({ ...form, trigger_config_value: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                    placeholder="7"
                  />
                </div>
              )}

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

              <label className="flex items-center gap-2 text-sm text-darktext/70">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-border"
                />
                Activate immediately
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gold hover:bg-gold-alt text-navy font-semibold py-3 rounded-lg text-sm mt-2 disabled:opacity-60 transition shadow-sm"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Automation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}