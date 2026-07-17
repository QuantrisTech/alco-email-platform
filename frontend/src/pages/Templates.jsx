import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, FileText, Search, X } from "lucide-react";
import { PageShell } from "../components/Topbar";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "", variablesText: "" });

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
        variables: form.variablesText.split(",").map((v) => v.trim()).filter(Boolean),
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
    <PageShell
      title="Templates"
      description="Reusable email content with dynamic variables."
      actions={
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:brightness-95"
        >
          <Plus className="size-4" /> New Template
        </button>
      }
    >
      <div className="mb-6 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border border-destructive/30 bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <article
              key={t.id}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <IconButton label={`Edit ${t.name}`} onClick={() => openEdit(t)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={`Delete ${t.name}`} danger onClick={() => handleDelete(t)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>

              <h3 className="mt-4 font-display text-base font-bold text-foreground">{t.name}</h3>
              <p className="text-sm font-medium text-muted-foreground">{t.subject}</p>
              <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {t.body}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {(t.variables || []).map((v) => (
                  <span
                    key={v}
                    className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-xs text-[oklch(0.45_0.1_75)]"
                  >
                    {`{${v}}`}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>Created {new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            </article>
          ))}

          <button
            onClick={openCreate}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent-foreground"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
              <Plus className="size-5" />
            </div>
            <span className="text-sm font-medium">Create new template</span>
          </button>
        </div>
      )}

      {!loading && templates.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {search ? "No templates match your search." : "No templates yet — create your first one above."}
        </p>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-foreground text-lg">
                {editing ? "Edit Template" : "New Template"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Template Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="Welcome Email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject Line</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="Welcome to {course}, {name}!"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Body</label>
                <textarea
                  required
                  rows={6}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-none"
                  placeholder="Hi {name}, welcome to..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Variables <span className="font-normal">(comma-separated, e.g. name, course)</span>
                </label>
                <input
                  value={form.variablesText}
                  onChange={(e) => setForm({ ...form, variablesText: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="name, course, batch"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-lg bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-60 hover:brightness-95 transition"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Template"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function IconButton({ children, label, danger, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={
        danger
          ? "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          : "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}