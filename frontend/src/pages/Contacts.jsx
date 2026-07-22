import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserMinus, Plus, Upload, X } from "lucide-react";
import { PageShell } from "../components/Topbar";
import { StatCard } from "../components/StatCard";
import { ContactsTable } from "../components/ContactsTable";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 10;

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function Contacts() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCount, setActiveCount] = useState(0);
  const [unsubCount, setUnsubCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", batch: "", course: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const [listRes, activeRes, unsubRes] = await Promise.all([
        fetch(`${API_URL}/contacts?${params}`, { headers: authHeaders() }),
        fetch(`${API_URL}/contacts?page=1&page_size=1&status=active`, { headers: authHeaders() }),
        fetch(`${API_URL}/contacts?page=1&page_size=1&status=unsubscribed`, { headers: authHeaders() }),
      ]);

      if ([listRes, activeRes, unsubRes].some((r) => r.status === 401)) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }
      if (!listRes.ok) throw new Error("Failed to load contacts");

      const data = await listRes.json();
      const activeData = await activeRes.json();
      const unsubData = await unsubRes.json();

      setContacts(data.items);
      setTotal(data.total);
      setActiveCount(activeData.total);
      setUnsubCount(unsubData.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
 }, [search, page, statusFilter, navigate]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Reset to page 1 whenever the search term changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
  setPage(1);
}, [search, statusFilter]);

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

  const handleBulkDelete = async (ids) => {
  try {
    await Promise.all(
      ids.map((id) => fetch(`${API_URL}/contacts/${id}`, { method: "DELETE", headers: authHeaders() }))
    );
    fetchContacts();
  } catch (err) {
    setError("Some contacts could not be deleted.");
  }
};

const handleBulkUnsubscribe = async (ids) => {
  try {
    await Promise.all(
      ids.map((id) =>
        fetch(`${API_URL}/contacts/${id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ status: "unsubscribed" }),
        })
      )
    );
    fetchContacts();
  } catch (err) {
    setError("Some contacts could not be unsubscribed.");
  }
};

  const unsubRate = total > 0 ? ((unsubCount / total) * 100).toFixed(1) : "0.0";
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageShell
      title="Contacts"
      description="Manage your audience and segments."
      actions={
        <div className="flex items-center gap-2">
          <button className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex">
            <Upload className="size-4" /> Import
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:brightness-95"
          >
            <Plus className="size-4" /> Add Contact
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-6 text-sm rounded-lg px-4 py-3 border text-destructive bg-destructive/10 border-destructive/20">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Contacts" value={total.toLocaleString()} sub="across all batches" icon={Users} />
        <StatCard label="Active" value={activeCount.toLocaleString()} sub="subscribed & engaged" icon={UserCheck} tone="green" />
        <StatCard label="Unsubscribed" value={unsubCount.toLocaleString()} sub={`${unsubRate}% of total`} icon={UserMinus} tone="gold" />
      </div>

      <ContactsTable
      contacts={contacts}
      loading={loading}
      search={search}
      setSearch={setSearch}
      onEdit={openEdit}
      onDelete={handleDelete}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onBulkDelete={handleBulkDelete}
      onBulkUnsubscribe={handleBulkUnsubscribe}
    />

      {modalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground text-lg">
                {editing ? "Edit Contact" : "Add Contact"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Batch</label>
                  <input
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Course</label>
                  <input
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                >
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-accent hover:brightness-95 text-accent-foreground font-semibold py-3 rounded-lg text-sm mt-2 disabled:opacity-60 transition shadow-sm"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Contact"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}