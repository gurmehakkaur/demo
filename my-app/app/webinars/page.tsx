"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "/api";

type Webinar = {
  id: string; title: string; description: string; host_name: string;
  scheduled_time: string; status: string;
  max_seats: number | null; registered_count: number; waitlist_count: number;
  my_status: "REGISTERED" | "WAITLISTED" | null;
};
type User = { id: number; name: string; email: string; role: string };

const statusColors: Record<string, string> = {
  SCHEDULED: "#3b82f6", LIVE: "#22c55e", COMPLETED: "#6b7280",
  DRAFT: "#d1d5db", PENDING_APPROVAL: "#f59e0b", CANCELLED: "#ef4444",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: statusColors[status] || "#6b7280" }}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser]         = useState<User | null>(null);
  const [token, setToken]       = useState("");
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState("");

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
    if (u.role !== "STUDENT") {
      router.push(u.role === "ADMIN" ? "/webinars/admin" : "/webinars/host");
      return;
    }
    setToken(tok); setUser(u);
    loadWebinars(tok).then(() => setLoading(false));
  }, [router, authHeaders]); // eslint-disable-line

  async function register(webinarId: string) {
    const res = await fetch(`${API}/webinars/${webinarId}/register`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) { await loadWebinars(token); flash("Registered successfully!"); }
    else flash(json.error);
  }

  async function unregister(webinarId: string) {
    const res = await fetch(`${API}/webinars/${webinarId}/unregister`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) { await loadWebinars(token); flash("Registration cancelled."); }
    else flash(json.error);
  }

  async function joinWaitlist(webinarId: string) {
    const res = await fetch(`${API}/webinars/${webinarId}/waitlist`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) { await loadWebinars(token); flash("Added to waitlist. You'll be contacted if a seat opens up."); }
    else flash(json.error);
  }

  async function leaveWaitlist(webinarId: string) {
    const res = await fetch(`${API}/webinars/${webinarId}/unwaitlist`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) { await loadWebinars(token); flash("Removed from waitlist."); }
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
          <span className="text-sm text-gray-300">Webinars</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.name}</span>
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold">STUDENT</span>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }}
            className="text-xs text-gray-400 hover:text-white transition-colors">Sign out</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upcoming Webinars</h1>
        <p className="text-sm text-gray-500 mb-6">Browse and register for live immigration sessions</p>

        {msg && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-700">{msg}</div>
        )}

        {webinars.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-400 shadow-sm">No webinars available right now.</div>
        )}

        <div className="flex flex-col gap-4">
          {webinars.map((w) => {
            const isFull = w.max_seats !== null && w.registered_count >= w.max_seats;
            const canAct = ["SCHEDULED", "LIVE"].includes(w.status);
            return (
              <div key={w.id} className="rounded-2xl bg-white p-6 shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="font-semibold text-gray-900 text-base">{w.title}</h2>
                    <StatusBadge status={w.status} />
                    {isFull && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white bg-red-500">
                        Full
                      </span>
                    )}
                    {w.my_status === "WAITLISTED" && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
                        Waitlisted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{w.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                    <span>Host: <strong className="text-gray-600">{w.host_name}</strong></span>
                    <span>{new Date(w.scheduled_time).toLocaleString()}</span>
                    {w.max_seats && (
                      <span className={isFull ? "text-red-500 font-medium" : ""}>
                        {w.registered_count}/{w.max_seats} seats
                        {w.waitlist_count > 0 && ` · ${w.waitlist_count} on waitlist`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                  {w.my_status === "REGISTERED" ? (
                    <button onClick={() => unregister(w.id)}
                      className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors">
                      Cancel
                    </button>
                  ) : w.my_status === "WAITLISTED" ? (
                    <button onClick={() => leaveWaitlist(w.id)}
                      className="rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
                      Leave Waitlist
                    </button>
                  ) : isFull && canAct ? (
                    <button onClick={() => joinWaitlist(w.id)}
                      className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors">
                      Join Waitlist
                    </button>
                  ) : (
                    <button onClick={() => register(w.id)}
                      disabled={!canAct}
                      className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Register
                    </button>
                  )}
                  {w.my_status === "WAITLISTED" && (
                    <p className="text-xs text-gray-400 text-right max-w-[140px]">
                      You&apos;ll be contacted if a seat opens up
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
