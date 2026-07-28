import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Users as UsersIcon, Shield } from "lucide-react";
import { PageShell } from "../components/Topbar";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function Team() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "editor" });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/users`, { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load team members");
      setUsers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const [currentUserRole, setCurrentUserRole] = useState(null);

useEffect(() => {
  fetch(`${API_URL}/auth/me`, { headers: authHeaders() })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => setCurrentUserRole(data?.role || null))
    .catch(() => {});
}, []);

  const openInvite = () => {
    setForm({ name: "", email: "", password: "", role: "editor" });
    setModalOpen(true);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create account");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  function initials(name) {
    return (name || "?")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <PageShell
      title="Team"
      description="Manage who has access to this platform."
      actions={
        currentUserRole === "admin" ? (
            <button
                onClick={openInvite}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:brightness-95"
            >
                <Plus className="size-4" /> Add Team Member
            </button>
  ) : null
}
    >
      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-destructive bg-destructive/10 border-destructive/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading team...</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {initials(u.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                  <Shield className="size-3" />
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground text-lg">Add Team Member</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Temporary Password</label>
                <input
                  required
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="They can change this later"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-ring"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-lg bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}