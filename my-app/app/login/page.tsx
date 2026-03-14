"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error); setLoading(false); return; }

      localStorage.setItem("bp_token", json.data.token);
      localStorage.setItem("bp_user", JSON.stringify(json.data.user));

      const role = json.data.user.role;
      if (role === "ADMIN")   router.push("/webinars/admin");
      else if (role === "HOST") router.push("/webinars/host");
      else                     router.push("/webinars");
    } catch {
      setError("Cannot connect to server. Is the backend running?");
      setLoading(false);
    }
  }

  const presets = [
    { label: "Admin",     email: "admin@borderpass.com",  password: "admin123",   color: "#ef4444" },
    { label: "Host",      email: "host@borderpass.com",   password: "host123",    color: "#f59e0b" },
    { label: "Student 1", email: "student1@example.com",  password: "student123", color: "#3b82f6" },
    { label: "Student 2", email: "student2@example.com",  password: "student123", color: "#3b82f6" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#efefef" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded-sm bg-[#1b1b2f]" />
            <div className="h-4 w-4 rounded-full bg-[#1b1b2f]" />
            <div className="h-4 w-4 rounded-full bg-[#1b1b2f]" />
          </div>
          <span className="text-xl font-semibold text-[#1b1b2f]">BorderPass</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-6">Webinars platform demo</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                placeholder="you@example.com" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                placeholder="••••••••" required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full rounded-full bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Quick-fill presets */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-3">Demo accounts — click to autofill</p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.email}
                  onClick={() => { setEmail(p.email); setPassword(p.password); setError(""); }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors"
                >
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <div>
                    <div className="font-medium text-gray-800">{p.label}</div>
                    <div className="text-gray-400 truncate">{p.email}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
