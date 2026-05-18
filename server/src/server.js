import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import Room from "./models/Room.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const getRoomParticipantCount = (ioInstance, roomCode) => {
  const participants = getRoomParticipants(ioInstance, roomCode);
  return participants.length;
};

const getRoomParticipants = (ioInstance, roomCode) => {
  const room = ioInstance.sockets.adapter.rooms.get(roomCode);
  if (!room) return [];

  const participants = [];
  const seenNames = new Set();

  room.forEach((socketId) => {
    const sock = ioInstance.sockets.sockets.get(socketId);
    const userName = sock?.data?.userName;
    if (userName && !seenNames.has(userName)) {
      seenNames.add(userName);
      participants.push(userName);
    }
  });
  return participants;
};

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  // Optimized specifically for Render Web Service routing layers
  const clientOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173"];

  const io = new Server(server, {
    cors: {
      origin: clientOrigins,
      credentials: true,
    },
    transports: ["polling", "websocket"], // Explicitly match frontend priority layout
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", async ({ roomCode, userName }) => {
      try {
        const room = await Room.findOne({ code: roomCode.toUpperCase() });
        if (!room) {
          return socket.emit("room-error", {
            message: "Room not found",
          });
        }

        socket.data.userName = userName || "Guest";
        socket.join(room.code);

        const participantCount = getRoomParticipantCount(io, room.code);
        const participantList = getRoomParticipants(io, room.code);
        io.to(room.code).emit("participant-count", participantCount);
        io.to(room.code).emit("participant-list", participantList);

        socket.emit("room-state", room.scene);
      } catch (error) {
        console.error("Socket join-room error:", error.message);
      }
    });

    socket.on("whiteboard-update", async ({ roomCode, scene }) => {
      try {
        const code = roomCode?.toUpperCase();
        if (code) {
          const normalizedScene = {
            elements: Array.isArray(scene?.elements) ? scene.elements : [],
            appState: {
              viewBackgroundColor:
                scene?.appState?.viewBackgroundColor || "#ffffff",
            },
          };

          socket.to(code).emit("room-state", normalizedScene);
          await Room.findOneAndUpdate(
            { code },
            { scene },
            { new: true }
          );
        }
      } catch (error) {
        console.error("Socket whiteboard-update error:", error.message);
      }
    });

    socket.on("leave-room", ({ roomCode }) => {
      try {
        const code = roomCode?.toUpperCase();
        if (code) {
          socket.leave(code);
          const participantCount = getRoomParticipantCount(io, code);
          const participantList = getRoomParticipants(io, code);
          io.to(code).emit("participant-count", participantCount);
          io.to(code).emit("participant-list", participantList);
        }
      } catch (error) {
        console.error("Socket leave-room error:", error?.message || error);
      }
    });

    socket.on("clear-board", async ({ roomCode }) => {
      try {
        const emptyScene = {
          elements: [],
          appState: { viewBackgroundColor: "#ffffff" },
        };

        const code = roomCode?.toUpperCase();
        if (code) {
          io.to(code).emit("room-state", emptyScene);
          await Room.findOneAndUpdate(
            { code },
            { scene: emptyScene },
            { new: true }
          );
        }
      } catch (error) {
        console.error("Socket clear-board error:", error.message);
      }
    });

    socket.on("disconnect", () => {
      const rooms = Array.from(socket.rooms).filter(
        (roomCode) => roomCode !== socket.id
      );

      rooms.forEach((roomCode) => {
        const participantCount = getRoomParticipantCount(io, roomCode);
        const participantList = getRoomParticipants(io, roomCode);
        io.to(roomCode).emit("participant-count", participantCount);
        io.to(roomCode).emit("participant-list", participantList);
      });

      console.log("User disconnected:", socket.id);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
