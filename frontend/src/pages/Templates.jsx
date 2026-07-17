import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, X, FileText } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", variablesText: "" });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`${API_URL}/templates?${params}`, { headers: authHeaders() });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load templates");

      const data = await res.json();
      setTemplates(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, navigate]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", subject: "", body: "", variablesText: "" });
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name,
      subject: t.subject,
      body: t.body,
      variablesText: (t.variables || []).join(", "),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_URL}/templates/${editing.id}` : `${API_URL}/templates`;
      const method = editing ? "PATCH" : "POST";
      const payload = {
        name: form.name,
        subject: form.subject,
        body: form.body,
        variables: form.variablesText
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Save failed");
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/templates/${t.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-darktext/35" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border text-sm bg-white focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gold hover:bg-gold-alt text-navy font-semibold text-sm px-4 py-2.5 rounded-lg transition shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Template
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-danger bg-red-50 border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-darktext/40">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-border py-16 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-lightgray flex items-center justify-center mb-3">
            <FileText size={20} className="text-darktext/30" />
          </div>
          <p className="text-darktext/70 font-medium">
            {search ? "No templates match your search" : "No templates yet"}
          </p>
          <p className="text-darktext/40 text-xs mt-1">
            {search ? "Try a different name" : "Create your first email template to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-navy truncate pr-2">{t.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-darktext/40 hover:text-navy hover:bg-lightgray p-1.5 rounded-md transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="text-darktext/40 hover:text-danger hover:bg-red-50 p-1.5 rounded-md transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-darktext/50 mb-2 truncate">{t.subject}</p>
              <p className="text-sm text-darktext/60 line-clamp-3">{t.body}</p>
              {t.variables.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.variables.map((v) => (
                    <span key={v} className="text-xs bg-lightgray text-darktext/60 px-2 py-0.5 rounded-full">
                      {"{" + v + "}"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-navy/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy text-lg">{editing ? "Edit Template" : "New Template"}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-darktext/40 hover:text-darktext hover:bg-lightgray p-1 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Template Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  placeholder="Welcome Email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Subject Line</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  placeholder="Welcome to {course}, {name}!"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Body</label>
                <textarea
                  required
                  rows={6}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition resize-none"
                  placeholder="Hi {name}, welcome to..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">
                  Variables <span className="text-darktext/40 font-normal">(comma-separated, e.g. name, course)</span>
                </label>
                <input
                  value={form.variablesText}
                  onChange={(e) => setForm({ ...form, variablesText: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  placeholder="name, course, batch"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gold hover:bg-gold-alt text-navy font-semibold py-3 rounded-lg text-sm mt-2 disabled:opacity-60 transition shadow-sm"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Template"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}