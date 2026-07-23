import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      navigate("/");;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightgray font-sans">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-8 text-center bg-navy">
          <img src="/logo.png" alt="AL&CO" className="h-20 mx-auto mb-2" />
          <p className="text-xs tracking-wide text-navy">
            Email Automation Platform
          </p>
        </div>

        <form onSubmit={handleLogin} className="px-8 py-6">
          {error && (
            <div className="mb-4 text-sm rounded-md px-3 py-2 border text-danger bg-red-50 border-red-200">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium mb-1 text-navy-light">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-navy-lighter"
            placeholder="you@alco.com"
          />

          <label className="block text-sm font-medium mb-1 text-navy-light">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-navy-lighter"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-2.5 rounded-md transition text-sm bg-gold text-navy disabled:opacity-60 hover:bg-gold-alt"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}