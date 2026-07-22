import { useMemo, useState } from "react"
import { Search, Pencil, Trash2, Filter, Mail, ChevronDown } from "lucide-react"
import { StatusBadge } from "./StatusBadge"

const filters = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Unsubscribed", value: "unsubscribed" },
]

// Colorful engine from your new UI design parameters
function initials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-accent/10 text-accent border-accent/20",
  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  "bg-amber-500/10 text-amber-500 border-amber-500/20"
];

function avatarColorClass(name) {
  if (!name) return AVATAR_COLORS[0];
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function ContactsTable({ contacts = [], loading, search, setSearch, onEdit, onDelete, page, totalPages, onPageChange, statusFilter, onStatusFilterChange, onBulkDelete, onBulkUnsubscribe }) {
  const [selected, setSelected] = useState([])

  const allSelected = contacts.length > 0 && selected.length === contacts.length

  function toggleAll() {
    setSelected(allSelected ? [] : contacts.map((c) => c.id || c._id))
  }
  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 text-foreground"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {filters.map((f) => (
  <button
    key={f.value}
    onClick={() => onStatusFilterChange(f.value)}
    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
      statusFilter === f.value
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`}
  >
    {f.label}
  </button>
))}
        </div>
      </div>

      {/* Selection banner */}
      {selected.length > 0 && (
  <div className="flex items-center justify-between border-b border-border bg-accent/10 px-4 py-2.5">
    <p className="text-sm font-medium text-foreground">{selected.length} selected</p>
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          onBulkUnsubscribe(selected)
          setSelected([])
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
      >
        <Mail className="size-3.5" /> Unsubscribe
      </button>
      <button
        onClick={() => {
          if (confirm(`Delete ${selected.length} contact(s)? This can't be undone.`)) {
            onBulkDelete(selected)
            setSelected([])
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3.5" /> Delete
      </button>
    </div>
  </div>
)}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-4 cursor-pointer rounded border-border accent-[oklch(0.26_0.07_264)]"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Batch</th>
              <th className="px-4 py-3 font-semibold">Course</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading database records...
                  </div>
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Filter className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No contacts found</p>
                    <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              contacts.map((c) => {
                const contactId = c.id || c._id;
                return (
                  <tr key={contactId} className="group transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.name}`}
                        checked={selected.includes(contactId)}
                        onChange={() => toggle(contactId)}
                        className="size-4 cursor-pointer rounded border-border accent-[oklch(0.26_0.07_264)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Colorful design-compliant dynamic avatars */}
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${avatarColorClass(
                            c.name
                          )}`}
                        >
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.batch ?? "Not enrolled"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.course ?? "Not enrolled"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onEdit(c)}
                          aria-label={`Edit ${c.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => onDelete(c)}
                          aria-label={`Delete ${c.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
  <p className="text-sm text-muted-foreground">
    Page <span className="font-medium text-foreground">{page}</span> of{" "}
    <span className="font-medium text-foreground">{totalPages}</span>
  </p>
  <div className="flex items-center gap-1">
    <button
      onClick={() => onPageChange(page - 1)}
      disabled={page <= 1}
      className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Previous
    </button>
    <button
      onClick={() => onPageChange(page + 1)}
      disabled={page >= totalPages}
      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Next
    </button>
  </div>
</div>
    </div>
  )
}