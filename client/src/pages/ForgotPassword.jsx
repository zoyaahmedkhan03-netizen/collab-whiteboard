import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      setMessage(response.data.message || "Password reset instructions sent.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
        <h1 className="text-3xl font-semibold text-slate-900">Forgot password</h1>
        <p className="mt-2 text-slate-600">Enter your email to receive password reset instructions.</p>

        {message && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-slate-700 border border-slate-200">{message}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="text-sky-600 hover:text-sky-500">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
