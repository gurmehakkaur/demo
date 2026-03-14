"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "";

type Webinar = {
  id: number; title: string; description: string; host_name: string;
  scheduled_time: string; status: string;
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
  const [user, setUser]           = useState<User | null>(null);
  const [token, setToken]         = useState("");
  const [webinars, setWebinars]   = useState<Webinar[]>([]);
  const [registered, setRegistered] = useState<Set<number>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState("");

  const authHeaders = useCallback((tok: string) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tok}`,
  }), []);

  useEffect(() => {
    const tok  = localStorage.getItem("bp_token") || "";
    const u    = JSON.parse(localStorage.getItem("bp_user") || "null");
    if (!tok || !u) { router.push("/login"); return; }
    if (u.role !== "STUDENT") {
      router.push(u.role === "ADMIN" ? "/webinars/admin" : "/webinars/host");
      return;
    }
    setToken(tok); setUser(u);

    async function load() {
      const [wRes] = await Promise.all([
        fetch(`${API}/webinars`, { headers: authHeaders(tok) }),
      ]);
      const wJson = await wRes.json();
      setWebinars(wJson.data || []);
      setLoading(false);
    }
    load();
  }, [router, authHeaders]);

  async function register(webinarId: number) {
    const res = await fetch(`${API}/webinars/${webinarId}/register`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) {
      setRegistered((prev) => new Set([...prev, webinarId]));
      setMsg("Registered successfully!");
    } else {
      setMsg(json.error);
    }
    setTimeout(() => setMsg(""), 3000);
  }

  async function unregister(webinarId: number) {
    const res = await fetch(`${API}/webinars/${webinarId}/unregister`, {
      method: "POST", headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.success) {
      setRegistered((prev) => { const s = new Set(prev); s.delete(webinarId); return s; });
      setMsg("Registration cancelled.");
    } else {
      setMsg(json.error);
    }
    setTimeout(() => setMsg(""), 3000);
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
            const isReg = registered.has(w.id);
            return (
              <div key={w.id} className="rounded-2xl bg-white p-6 shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-semibold text-gray-900 text-base">{w.title}</h2>
                    <StatusBadge status={w.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{w.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Host: <strong className="text-gray-600">{w.host_name}</strong></span>
                    <span>{new Date(w.scheduled_time).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isReg ? (
                    <button onClick={() => unregister(w.id)}
                      className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors">
                      Cancel
                    </button>
                  ) : (
                    <button onClick={() => register(w.id)}
                      disabled={!["SCHEDULED", "LIVE"].includes(w.status)}
                      className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Register
                    </button>
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
