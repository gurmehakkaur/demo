"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "/api";

type Webinar = {
  id: number; title: string; description: string; host_name: string;
  scheduled_time: string; status: string; attendee_count?: number;
};

const statusColors: Record<string, string> = {
  SCHEDULED: "#3b82f6", LIVE: "#22c55e", COMPLETED: "#6b7280",
  DRAFT: "#9ca3af", PENDING_APPROVAL: "#f59e0b", CANCELLED: "#ef4444",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: statusColors[status] || "#6b7280" }}>
      {status.replace("_", " ")}
    </span>
  );
}

const FILTER_OPTIONS = ["ALL", "PENDING_APPROVAL", "SCHEDULED", "LIVE", "DRAFT", "COMPLETED", "CANCELLED"];

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken]       = useState("");
  const [user, setUser]         = useState<{ name: string; role: string } | null>(null);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState({ text: "", ok: true });
  const [filter, setFilter]     = useState("ALL");

  const authHeaders = useCallback((tok: string) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tok}`,
  }), []);

  function flash(text: string, ok = true) {
    setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 3500);
  }

  async function loadWebinars(tok: string) {
    const res = await fetch(`${API}/admin/webinars`, { headers: authHeaders(tok) });
    const json = await res.json();
    setWebinars(json.data || []);
  }

  useEffect(() => {
    const tok = localStorage.getItem("bp_token") || "";
    const u   = JSON.parse(localStorage.getItem("bp_user") || "null");
    if (!tok || !u) { router.push("/login"); return; }
    if (u.role !== "ADMIN") {
      router.push(u.role === "HOST" ? "/webinars/host" : "/webinars");
      return;
    }
    setToken(tok); setUser(u);
    loadWebinars(tok).then(() => setLoading(false));
  }, [router, authHeaders]); // eslint-disable-line

  async function action(webinarId: number, endpoint: string, label: string) {
    const res = await fetch(`${API}/webinars/${webinarId}/${endpoint}`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) { await loadWebinars(token); flash(`${label}: done`); }
    else flash(json.error, false);
  }

  const filtered = filter === "ALL" ? webinars : webinars.filter((w) => w.status === filter);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#efefef" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-[#1b1b2f] text-white">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-sm bg-white opacity-90" />
            <div className="h-3 w-3 rounded-full bg-white opacity-90" />
            <div className="h-3 w-3 rounded-full bg-white opacity-90" />
          </div>
          <span className="font-semibold">BorderPass</span>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-sm text-gray-300">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.name}</span>
          <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold">ADMIN</span>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }}
            className="text-xs text-gray-400 hover:text-white transition-colors">Sign out</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total",            count: webinars.length,                                               color: "#1b1b2f" },
            { label: "Pending Approval", count: webinars.filter((w) => w.status === "PENDING_APPROVAL").length, color: "#f59e0b" },
            { label: "Live Now",         count: webinars.filter((w) => w.status === "LIVE").length,             color: "#22c55e" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.count}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">All Webinars</h1>
          {/* Filter */}
          <div className="flex gap-2 flex-wrap justify-end">
            {FILTER_OPTIONS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}>
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {msg.text && (
          <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
            msg.ok ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-700"
          }`}>{msg.text}</div>
        )}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-400 shadow-sm">No webinars match this filter.</div>
        )}

        <div className="flex flex-col gap-4">
          {filtered.map((w) => (
            <div key={w.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="font-semibold text-gray-900">{w.title}</h2>
                    <StatusBadge status={w.status} />
                    {w.attendee_count !== undefined && w.attendee_count > 0 && (
                      <span className="text-xs text-gray-400">{w.attendee_count} registered</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{w.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Host: <strong className="text-gray-600">{w.host_name}</strong></span>
                    <span>{new Date(w.scheduled_time).toLocaleString()}</span>
                    <span className="text-gray-300">id:{w.id}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {w.status === "PENDING_APPROVAL" && (
                    <>
                      <button onClick={() => action(w.id, "approve", "Approved")}
                        className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => action(w.id, "reject", "Rejected")}
                        className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors">
                        Reject
                      </button>
                    </>
                  )}
                  {!["COMPLETED", "CANCELLED"].includes(w.status) && (
                    <button onClick={() => action(w.id, "cancel", "Cancelled")}
                      className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
