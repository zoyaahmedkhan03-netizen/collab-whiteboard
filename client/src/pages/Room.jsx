import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Excalidraw } from "@excalidraw/excalidraw";
import api from "../api.js";
import "@excalidraw/excalidraw/index.css";


const initialScene = {
  elements: [],
  appState: {
    viewBackgroundColor: "#ffffff",
    collaborators: [],
  },
};

const safeParseJSON = (value, fallback = null) => {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeScene = (scene) => {
  if (!scene || typeof scene !== "object") {
    return initialScene;
  }

  return {
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    appState: {
      ...(scene.appState ?? {}),
      viewBackgroundColor:
        scene.appState?.viewBackgroundColor ?? initialScene.appState.viewBackgroundColor,
      collaborators: Array.isArray(scene.appState?.collaborators)
        ? scene.appState.collaborators
        : [],
    },
  };
};

const Room = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [roomTitle, setRoomTitle] = useState("Collaborative Room");
  const [statusMessage, setStatusMessage] = useState("Connecting...");
  const [participantCount, setParticipantCount] = useState(1);
  const [participants, setParticipants] = useState([]);
  const [scene, setScene] = useState(initialScene);
  const [initialSceneData, setInitialSceneData] = useState(null);
  const [sceneKey, setSceneKey] = useState(0);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [pendingScene, setPendingScene] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    safeParseJSON(localStorage.getItem("canvaslink-sidebar-collapsed"), false)
  );
  const socketRef = useRef(null);
  const excalidrawRef = useRef(null);
  const remoteUpdate = useRef(false);
  const user = safeParseJSON(localStorage.getItem("user"), null);
  const localSceneKey = `canvaslink-scene-${code}`;


  const inviteLink = useMemo(
    () => `${window.location.origin}/room/${code}`,
    [code]
  );


  useEffect(() => {
    if (!code) {
      navigate("/dashboard");
      return;
    }


    const fetchRoom = async () => {
      try {
        const response = await api.get(`/api/room/${code}`);
        setRoomTitle(response.data.room.title || `Room ${code}`);
        const savedScene = safeParseJSON(localStorage.getItem(localSceneKey), null);
        const rawScene = response.data.room.scene || savedScene || initialScene;
        const roomScene = normalizeScene(rawScene);
        setScene(roomScene);
        setInitialSceneData(roomScene);
        localStorage.setItem(localSceneKey, JSON.stringify(roomScene));
        setParticipantCount(response.data.room.participantCount || 1);
        setSceneLoaded(true);
      } catch (err) {
        const savedScene = safeParseJSON(localStorage.getItem(localSceneKey), null);
        if (savedScene) {
          const roomScene = normalizeScene(savedScene);
          setScene(roomScene);
          setInitialSceneData(roomScene);
          localStorage.setItem(localSceneKey, JSON.stringify(roomScene));
        } else {
          setInitialSceneData(initialScene);
        }
        setStatusMessage(err.response?.data?.message || "Room not found");
        setSceneLoaded(true);
      }
    };


    fetchRoom();
  }, [code, navigate, localSceneKey]);


  useEffect(() => {
    const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
    const cleanUrl = baseUrl.replace(/\/$/, "");

    // Use default options and let the client negotiate the best transport/protocol.
    // Avoid forcing insecure TLS options which can cause runtime errors in browsers.
    const socket = io(cleanUrl, {
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;




    socket.on("connect", () => {
      setStatusMessage("Connected");
      socket.emit("join-room", {
        roomCode: code,
        userName: user?.name || "Guest",
      });
    });


    socket.on("room-state", (newScene) => {
      if (!newScene) return;
      const roomScene = normalizeScene(newScene);
      remoteUpdate.current = true;
      setScene(roomScene);
      localStorage.setItem(localSceneKey, JSON.stringify(roomScene));
      setSceneLoaded(true);
      if (excalidrawRef.current) {
        excalidrawRef.current.updateScene(roomScene);
      } else {
        setPendingScene(roomScene);
      }
    });


    socket.on("participant-count", setParticipantCount);
    socket.on("participant-list", (list) => {
      setParticipants(list || []);
      setParticipantCount(list?.length ?? 0);
    });


    socket.on("room-error", ({ message }) => {
      setStatusMessage(message);
    });


    socket.on("connect_error", (err) => {
      console.error("socket connect_error:", err);
      setStatusMessage("Unable to connect to the server.");
    });

    socket.on("error", (err) => {
      console.error("socket error:", err);
    });


    return () => {
      socket.disconnect();
    };
  }, [code, user?.name, localSceneKey]);

  // Ensure we notify the server and disconnect socket when the page is closed/unloaded.
  useEffect(() => {
    const handleUnload = () => {
      try {
        if (socketRef.current) {
          socketRef.current.emit("leave-room", { roomCode: code, userName: user?.name || "Guest" });
          socketRef.current.disconnect();
        }
      } catch (e) {
        // best-effort — do not block unload
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [code, user?.name]);


  useEffect(() => {
    if (pendingScene && excalidrawRef.current) {
      excalidrawRef.current.updateScene(pendingScene);
      setPendingScene(null);
    }
  }, [pendingScene]);


    const handleWhiteboardChange = useCallback(
    (elements, appState) => {
      // Create the structured next scene format
      const nextScene = { elements, appState };
      const normalizedScene = normalizeScene(nextScene);

      // Save it locally in local storage for persistence
      localStorage.setItem(localSceneKey, JSON.stringify(normalizedScene));

      
      if (remoteUpdate.current) {
        remoteUpdate.current = false;
        return;
      }

      
      setScene(normalizedScene);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("whiteboard-update", {
          roomCode: code,
          scene: normalizedScene,
        });
      }
    },
    [code, localSceneKey]
  );




  const clearBoard = () => {
    const emptyScene = normalizeScene({
      elements: [],
      appState: { viewBackgroundColor: "#ffffff" },
    });
    setScene(emptyScene);
    setSceneKey((prev) => prev + 1);
    localStorage.setItem(localSceneKey, JSON.stringify(emptyScene));
    socketRef.current?.emit("clear-board", {
      roomCode: code,
    });
  };


  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setStatusMessage("Could not copy the invite link.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-sky-600">Live room</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">{roomTitle}</h1>
              <p className="mt-2 text-slate-500">Room code: <span className="font-medium text-slate-700">{code}</span></p>
              {statusMessage ? (
                <p className="mt-2 text-sm text-slate-500">{statusMessage}</p>
              ) : null}
            </div>


            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4 text-center shadow-inner shadow-slate-200/60">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Participants</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{participantCount}</p>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Leave room
              </button>
            </div>
          </div>
        </header>


        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Invite teammates</h2>
                  <p className="mt-2 text-sm text-slate-500">Share this link so collaborators enter the same whiteboard.</p>
                </div>
              </div>


              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="truncate">{inviteLink}</span>
                </div>
                <button
                  onClick={handleCopyInvite}
                  className="w-full rounded-3xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  {inviteCopied ? "Link copied" : "Copy invite link"}
                </button>
              </div>
            </section>


            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Participants</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500">live</span>
              </div>
              <div className="mt-5 space-y-3">
                {participants.length > 0 ? (
                  participants.map((name, index) => (
                    <div
                      key={`${name}-${index}`}
                      className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm shadow-slate-100"
                    >
                      <span>{name}</span>
                      {name === user?.name ? (
                        <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-sky-600">you</span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No collaborators joined yet.</p>
                )}
              </div>
            </section>


            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <h2 className="text-xl font-semibold text-slate-900">Quick tips</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex gap-2"><span className="font-semibold text-slate-900">•</span> Use Undo / Redo for fast iteration.</li>
                <li className="flex gap-2"><span className="font-semibold text-slate-900">•</span> Copy the link to invite others instantly.</li>
                <li className="flex gap-2"><span className="font-semibold text-slate-900">•</span> Clearing syncs the board for everyone.</li>
              </ul>
            </section>
          </aside>


          <main className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
            <div className="mb-4 flex justify-end">
              <button
                onClick={clearBoard}
                className="rounded-3xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400"
              >
                Clear board
              </button>
            </div>


            <div className={`relative h-[74vh] min-h-[450px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-inner shadow-slate-200/60 ${sidebarCollapsed ? "hide-excalidraw-sidepanel" : ""
              }`}>
              <button
                onClick={() => setSidebarCollapsed((collapsed) => {
                  const next = !collapsed;
                  localStorage.setItem(
                    "canvaslink-sidebar-collapsed",
                    JSON.stringify(next)
                  );
                  return next;
                })}
                title={sidebarCollapsed ? "Show side controls" : "Hide side controls"}
                className="absolute left-20 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <span className="sr-only">{sidebarCollapsed ? "Show side controls" : "Hide side controls"}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-5 w-5 transition-transform duration-200 ${sidebarCollapsed ? "scale-110" : ""}`}
                >
                  <rect x="3" y="5" width="4" height="14" rx="1" />
                  <rect x="9" y="5" width="12" height="14" rx="1" />
                </svg>
              </button>
              {sceneLoaded && initialSceneData ? (
                <Excalidraw
                  key={sceneKey}
                  excalidrawAPI={(api) => {
                    excalidrawRef.current = api;
                  }}
                  initialData={initialSceneData}
                  onChange={handleWhiteboardChange}
                  name={roomTitle}
                  theme="light"
                  viewModeEnabled={false}
                  zenModeEnabled={false}
                />
              ) : (

                <div className="flex h-full items-center justify-center text-slate-500">
                  Loading whiteboard...
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};


export default Room;
