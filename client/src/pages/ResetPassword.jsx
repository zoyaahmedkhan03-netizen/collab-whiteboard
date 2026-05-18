import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api.js";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        password,
      });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
        <h1 className="text-3xl font-semibold text-slate-900">Reset password</h1>
        <p className="mt-2 text-slate-600">Choose a new password to access your account.</p>

        {message && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-slate-700 border border-slate-200">{message}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={6}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm password
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              required
              minLength={6}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Reset password"}
          </button>
        </form>

        {!token && (
          <div className="mt-4 rounded-2xl bg-amber-100 p-3 text-amber-900 border border-amber-200">
            Missing reset token. Please use the link from your email.
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
