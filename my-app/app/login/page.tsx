"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "/api";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function ProfileSelectionPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch available profiles
    fetch(`${API}/auth/users`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setUsers(json.data);
        } else {
          setError(json.error || "Failed to load profiles");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot connect to server. Is the backend running?");
        setLoading(false);
      });
  }, []);

  const selectProfile = async (user: User) => {
    try {
      const res = await fetch(`${API}/auth/select-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to select profile");
        return;
      }
      
      // Store token and user info
      localStorage.setItem("bp_token", json.data.token);
      localStorage.setItem("bp_user", JSON.stringify(json.data.user));

      // Redirect based on role
      if (json.data.user.role === "ADMIN") {
        router.push("/webinars/admin");
      } else if (json.data.user.role === "HOST") {
        router.push("/webinars/host");
      } else {
        router.push("/webinars");
      }
    } catch {
      setError("Cannot connect to server. Is the backend running?");
    }
  };

  const roleColors: Record<string, { bg: string; border: string; text: string }> = {
    ADMIN: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
    HOST: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    STUDENT: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#efefef" }}>
      <div className="w-full max-w-2xl px-4">
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Select Profile</h1>
          <p className="text-sm text-gray-500 mb-6">Choose a profile to continue (demo - no authentication required)</p>

          {loading && (
            <div className="text-center py-8 text-gray-500">Loading profiles...</div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 mb-6">
              {error}
            </div>
          )}

          {!loading && users.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((user) => {
                const colors = roleColors[user.role] || roleColors.STUDENT;
                return (
                  <button
                    key={user.id}
                    onClick={() => selectProfile(user)}
                    className="text-left p-4 rounded-lg border-2 transition-all hover:shadow-md"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    }}
                  >
                    <div className="font-semibold" style={{ color: colors.text }}>
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{user.email}</div>
                    <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{
                        backgroundColor:
                          user.role === "ADMIN"
                            ? "#ef4444"
                            : user.role === "HOST"
                            ? "#f59e0b"
                            : "#3b82f6",
                      }}
                    >
                      {user.role}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && users.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">
              No profiles available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
