import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, X, Users } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["bg-navy", "bg-navy-lighter", "bg-gold-alt"];
function avatarColor(name) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", batch: "", course: "", status: "active" });
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      if (search) params.set("search", search);

      const res = await fetch(`${API_URL}/contacts?${params}`, { headers: authHeaders() });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load contacts");

      const data = await res.json();
      setContacts(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, navigate]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", batch: "", course: "", status: "active" });
    setModalOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm({
      name: contact.name,
      email: contact.email,
      batch: contact.batch || "",
      course: contact.course || "",
      status: contact.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_URL}/contacts/${editing.id}` : `${API_URL}/contacts`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Save failed");
      }
      setModalOpen(false);
      fetchContacts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contact) => {
    if (!confirm(`Delete ${contact.name}? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/contacts/${contact.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      fetchContacts();
    } catch (err) {
      setError(err.message);
    }
  };

  const activeCount = contacts.filter((c) => c.status === "active").length;
  const unsubCount = contacts.filter((c) => c.status === "unsubscribed").length;

  return (
    <div className="max-w-6xl">
        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-border px-5 py-4">
          <p className="text-xs font-medium text-darktext/50 uppercase tracking-wide">Total Contacts</p>
          <p className="text-2xl font-semibold text-navy mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-lg border border-border px-5 py-4">
          <p className="text-xs font-medium text-darktext/50 uppercase tracking-wide">Active</p>
          <p className="text-2xl font-semibold text-success mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-border px-5 py-4">
          <p className="text-xs font-medium text-darktext/50 uppercase tracking-wide">Unsubscribed</p>
          <p className="text-2xl font-semibold text-danger mt-1">{unsubCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-darktext/35" />
          <input
            type="text"
            placeholder="Search name or email..."
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
          Add Contact
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-danger bg-red-50 border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-lightgray/60 border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Contact</th>
              <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Batch</th>
              <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Course</th>
              <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 font-medium text-darktext/50 text-xs uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-darktext/40">
                  Loading contacts...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-lightgray flex items-center justify-center mb-3">
                      <Users size={20} className="text-darktext/30" />
                    </div>
                    <p className="text-darktext/70 font-medium">
                      {search ? "No contacts match your search" : "No contacts yet"}
                    </p>
                    <p className="text-darktext/40 text-xs mt-1">
                      {search ? "Try a different name or email" : "Add your first contact to get started"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-lightgray/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${avatarColor(c.name)} text-white text-xs font-semibold flex items-center justify-center shrink-0`}
                      >
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-darktext truncate">{c.name}</p>
                        <p className="text-darktext/50 text-xs truncate">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-darktext/70">{c.batch || "—"}</td>
                  <td className="px-5 py-3.5 text-darktext/70">{c.course || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.status === "active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.status === "active" ? "bg-success" : "bg-danger"}`} />
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-darktext/40 hover:text-navy hover:bg-lightgray p-1.5 rounded-md transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-darktext/40 hover:text-danger hover:bg-red-50 p-1.5 rounded-md transition ml-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-navy/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-navy text-lg">{editing ? "Edit Contact" : "Add Contact"}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-darktext/40 hover:text-darktext hover:bg-lightgray p-1 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-light mb-1.5">Batch</label>
                  <input
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-light mb-1.5">Course</label>
                  <input
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-light mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-navy-lighter focus:ring-2 focus:ring-navy-lighter/10 transition"
                >
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gold hover:bg-gold-alt text-navy font-semibold py-3 rounded-lg text-sm mt-2 disabled:opacity-60 transition shadow-sm"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Contact"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}