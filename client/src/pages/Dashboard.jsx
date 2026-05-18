import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

const Dashboard = () => {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const createRoom = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/api/room/create", {
        title: roomName || "Untitled room",
      });
      navigate(`/room/${response.data.room.code}`);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to create room.");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/api/room/join", {
        roomCode,
      });
      navigate(`/room/${response.data.room.code}`);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to join room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-sky-600">Welcome back</p>
              <h1 className="mt-4 text-5xl font-semibold text-slate-900">{user?.name || "Collaborator"}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Create a collaborative whiteboard room or join an existing one with a teammate's code.
              </p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-200"
            >
              Logout
            </button>
          </div>
        </header>

        {message && (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-inner shadow-rose-200/40">
            {message}
          </div>
        )}

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-900">Create a room</h2>
            <p className="mt-3 text-slate-600">
              Start a new board and invite collaborators with a single link.
            </p>

            <form onSubmit={createRoom} className="mt-8 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Room name
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-sky-500"
                  placeholder="e.g. Product roadmap"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-sky-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating room..." : "Create room"}
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-900">Join a room</h2>
            <p className="mt-3 text-slate-600">
              Enter your teammate's room code to join the same board.
            </p>

            <form onSubmit={joinRoom} className="mt-8 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Room code
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-sky-500"
                  placeholder="ABCD12"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-sky-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Joining room..." : "Join room"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
