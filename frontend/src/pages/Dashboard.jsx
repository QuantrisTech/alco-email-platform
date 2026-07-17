import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, FileText, Send, Zap, ArrowRight, Clock } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function StatCard({ icon: Icon, label, value, subtext, to, accent }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-navy-lighter/30 transition group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={18} />
        </div>
        <ArrowRight size={15} className="text-darktext/20 group-hover:text-navy-lighter group-hover:translate-x-0.5 transition" />
      </div>
      <p className="text-2xl font-semibold text-navy mt-4">{value}</p>
      <p className="text-sm text-darktext/60 mt-0.5">{label}</p>
      {subtext && <p className="text-xs text-darktext/40 mt-1">{subtext}</p>}
    </Link>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    contactsTotal: 0,
    contactsActive: 0,
    templatesTotal: 0,
    campaignsTotal: 0,
    campaignsDraft: 0,
    automationsActive: 0,
    automationsTotal: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [contactsRes, templatesRes, campaignsRes, automationsRes] = await Promise.all([
        fetch(`${API_URL}/contacts?page=1&page_size=1`, { headers: authHeaders() }),
        fetch(`${API_URL}/templates`, { headers: authHeaders() }),
        fetch(`${API_URL}/campaigns`, { headers: authHeaders() }),
        fetch(`${API_URL}/automations`, { headers: authHeaders() }),
      ]);

      if ([contactsRes, templatesRes, campaignsRes, automationsRes].some((r) => r.status === 401)) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }
      if (![contactsRes, templatesRes, campaignsRes, automationsRes].every((r) => r.ok)) {
        throw new Error("Failed to load dashboard data");
      }

      const [activeRes] = await Promise.all([
        fetch(`${API_URL}/contacts?page=1&page_size=1&status=active`, { headers: authHeaders() }),
      ]);

      const contacts = await contactsRes.json();
      const active = await activeRes.json();
      const templates = await templatesRes.json();
      const campaigns = await campaignsRes.json();
      const automations = await automationsRes.json();

      setStats({
        contactsTotal: contacts.total,
        contactsActive: active.total,
        templatesTotal: templates.total,
        campaignsTotal: campaigns.total,
        campaignsDraft: campaigns.items.filter((c) => c.status === "draft").length,
        automationsActive: automations.items.filter((a) => a.is_active).length,
        automationsTotal: automations.total,
      });
      setRecentCampaigns(campaigns.items.slice(0, 5));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return <div className="text-center py-16 text-darktext/40">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-6xl">
      {error && (
        <div className="mb-4 text-sm rounded-lg px-4 py-3 border text-danger bg-red-50 border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Contacts"
          value={stats.contactsTotal}
          subtext={`${stats.contactsActive} active`}
          to="/contacts"
          accent="bg-navy-lighter/10 text-navy-lighter"
        />
        <StatCard
          icon={FileText}
          label="Templates"
          value={stats.templatesTotal}
          subtext="ready to use"
          to="/templates"
          accent="bg-gold/15 text-gold-alt"
        />
        <StatCard
          icon={Send}
          label="Campaigns"
          value={stats.campaignsTotal}
          subtext={`${stats.campaignsDraft} draft`}
          to="/campaigns"
          accent="bg-navy/10 text-navy"
        />
        <StatCard
          icon={Zap}
          label="Automations"
          value={stats.automationsTotal}
          subtext={`${stats.automationsActive} active`}
          to="/automations"
          accent="bg-success/10 text-success"
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-navy text-sm">Recent Campaigns</h2>
          <Link to="/campaigns" className="text-xs text-navy-lighter hover:underline">
            View all
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-lightgray flex items-center justify-center mb-2">
              <Send size={16} className="text-darktext/30" />
            </div>
            <p className="text-sm text-darktext/50">No campaigns yet</p>
          </div>
        ) : (
          <div>
            {recentCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-darktext">{c.name}</p>
                  <p className="text-xs text-darktext/40 mt-0.5">{c.template.name || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  {c.schedule_at && (
                    <span className="flex items-center gap-1 text-xs text-darktext/40">
                      <Clock size={12} />
                      {new Date(c.schedule_at).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      c.status === "sent"
                        ? "bg-success/10 text-success"
                        : c.status === "failed"
                        ? "bg-danger/10 text-danger"
                        : "bg-lightgray text-darktext/60"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}