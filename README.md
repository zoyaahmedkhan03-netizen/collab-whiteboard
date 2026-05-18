# Collab Whiteboard

Collaborative whiteboard built with Excalidraw, React (Vite), Socket.IO, and MongoDB.

## Project overview

- Real-time collaborative whiteboard using Excalidraw for the drawing canvas.
- Server manages rooms, persists scenes to MongoDB, and broadcasts updates via Socket.IO (Redis adapter optional for scaling).
- Client stores a local fallback scene in `localStorage` and normalizes incoming scenes for stability.
- Features: live collaboration, persistent rooms, clear board sync, automatic leave-on-close, and custom Excalidraw UI tweaks.

## Repo structure

- `client/` — React + Vite frontend application (Excalidraw integration)
- `server/` — Express + Socket.IO backend, MongoDB models and REST API

## Prerequisites

- Node.js 18+ and npm
- MongoDB (URI for production) — local MongoDB works for development
- Optional: Redis (for Socket.IO adapter when scaling across nodes)

## Environment variables

Server (`server/.env`):
- `PORT` (default 5000)
- `MONGO_URI` — MongoDB connection string
- `REDIS_URL` — optional Redis URL for Socket.IO adapter
- `CLIENT_URL` — allowed client origin (defaults to http://localhost:5173)

Client (`client/.env`):
- `VITE_SERVER_URL` — base URL of the server (e.g. http://localhost:5000)

> A `.env.example` file has been added to `server/` and `client/` so you can copy and fill in your local credentials without committing secrets.
>
> The repository includes a root `.gitignore` so generated files like `node_modules/`, `dist/`, and `.env` are not pushed to GitHub.

## Setup (development)

1. Install dependencies

```bash
# from repo root
cd server
npm install

# in a separate terminal
cd ../client
npm install
```

2. Configure env files

- Copy `.env.example` (if present) or create `.env` in `server/` and `client/` with values above.

3. Run locally

```bash
# Start server
cd server
npm run dev

# Start client
cd ../client
npm run dev
```

Open the client URL (usually `http://localhost:5173`) and create/join a room.

## Build for production

```bash
# Build client
cd client
npm run build

# Start the server (ensure server can serve built files or use a separate static host)
cd ../server
npm start
```

## Testing the leave-on-close behavior

- Open the same room in two browser windows/tabs. Close one tab/window — the remaining client should receive updated `participant-count` and `participant-list` soon after.
- Note: browser unload events are best-effort; the server also handles socket `disconnect` fallback.

## Notes for contributors

- Excalidraw integration lives in `client/src/pages/Room.jsx`. UI customizations (top-right menu, footer) are implemented via Excalidraw props and light CSS overrides.
- Room scenes are normalized before updating the client state to avoid corrupt/invalid scenes.

## Troubleshooting

- If participants do not update after closing a tab, ensure server logs show the socket disconnect or `leave-room` event; network conditions can affect on-unload delivery.
- For scaling, configure `REDIS_URL` and ensure Redis is reachable.
