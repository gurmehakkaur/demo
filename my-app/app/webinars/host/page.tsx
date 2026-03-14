"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "/api";

type Webinar = {
  id: number; title: string; description: string; host_name: string;
  scheduled_time: string; status: string;
};
type Attendee = { registration_id: number; student_id: number; name: string; email: string };

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

export default function HostDashboard() {
  const router = useRouter();
  const [token, setToken]         = useState("");
  const [user, setUser]           = useState<{ id: number; name: string; role: string } | null>(null);
  const [webinars, setWebinars]   = useState<Webinar[]>([]);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState("");

  // Create form
  const [showForm, setShowForm]   = useState(false);
  const [title, setTitle]         = useState("");
  const [description, setDescription] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Attendees panel
  const [attendees, setAttendees]     = useState<Attendee[] | null>(null);
  const [attendeesWebinar, setAttendeesWebinar] = useState<Webinar | null>(null);

  const authHeaders = useCallback((tok: string) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tok}`,
  }), []);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3500); }

  async function loadWebinars(tok: string) {
    const res = await fetch(`${API}/webinars`, { headers: authHeaders(tok) });
    const json = await res.json();
    setWebinars(json.data || []);
  }

  useEffect(() => {
    const tok = localStorage.getItem("bp_token") || "";
    const u   = JSON.parse(localStorage.getItem("bp_user") || "null");
    if (!tok || !u) { router.push("/login"); return; }
    if (u.role !== "HOST") {
      router.push(u.role === "ADMIN" ? "/webinars/admin" : "/webinars");
      return;
    }
    setToken(tok); setUser(u);
    loadWebinars(tok).then(() => setLoading(false));
  }, [router, authHeaders]); // eslint-disable-line

  async function createWebinar(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/webinars`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ title, description, scheduled_time: new Date(scheduledTime).toISOString() }),
    });
    const json = await res.json();
    if (json.success) {
      setWebinars((prev) => [...prev, json.data]);
      setTitle(""); setDescription(""); setScheduledTime(""); setShowForm(false);
      flash("Webinar created as DRAFT.");
    } else { flash(json.error); }
  }

  async function action(webinarId: number, endpoint: string) {
    const res = await fetch(`${API}/webinars/${webinarId}/${endpoint}`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) { await loadWebinars(token); flash(`Done: ${endpoint}`); }
    else flash(json.error);
  }

  async function viewAttendees(w: Webinar) {
    const res = await fetch(`${API}/webinars/${w.id}/attendees`, { headers: authHeaders(token) });
    const json = await res.json();
    if (json.success) { setAttendees(json.data.attendees); setAttendeesWebinar(w); }
    else flash(json.error);
  }

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
          <span className="text-sm text-gray-300">Host Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.name}</span>
          <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold">HOST</span>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }}
            className="text-xs text-gray-400 hover:text-white transition-colors">Sign out</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Webinars</h1>
            <p className="text-sm text-gray-500">Create and manage your sessions</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            {showForm ? "Cancel" : "+ New Webinar"}
          </button>
        </div>

        {msg && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-700">{msg}</div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={createWebinar} className="rounded-2xl bg-white p-6 shadow-sm mb-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">New Webinar</h2>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
              rows={3} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 resize-none" />
            <input required type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
            <button type="submit"
              className="self-end rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
              Create
            </button>
          </form>
        )}

        {/* Webinar list */}
        {webinars.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-400 shadow-sm">No webinars yet. Create one above.</div>
        )}
        <div className="flex flex-col gap-4">
          {webinars.map((w) => (
            <div key={w.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-semibold text-gray-900">{w.title}</h2>
                    <StatusBadge status={w.status} />
                  </div>
                  <p className="text-sm text-gray-500">{w.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(w.scheduled_time).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {w.status === "DRAFT" && (
                  <button onClick={() => action(w.id, "submit")}
                    className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors">
                    Submit for Approval
                  </button>
                )}
                {w.status === "SCHEDULED" && (
                  <button onClick={() => action(w.id, "start")}
                    className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                    Start Webinar
                  </button>
                )}
                {["SCHEDULED", "LIVE", "COMPLETED"].includes(w.status) && (
                  <button onClick={() => viewAttendees(w)}
                    className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    View Attendees
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendees drawer */}
      {attendees !== null && attendeesWebinar && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setAttendees(null)}>
          <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Attendees — {attendeesWebinar.title}</h2>
              <button onClick={() => setAttendees(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {attendees.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No registrations yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {attendees.map((a) => (
                  <div key={a.registration_id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {a.name?.[0] || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
