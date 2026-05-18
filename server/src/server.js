import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import app from "./app.js";
import connectDB from "./config/db.js";
import Room from "./models/Room.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const createSocketAdapter = async (io) => {
  if (!process.env.REDIS_URL) {
    return;
  }

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.IO Redis adapter connected");
};

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

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  await createSocketAdapter(io);

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
        socket.to(roomCode).emit("room-state", scene);
        await Room.findOneAndUpdate(
          { code: roomCode.toUpperCase() },
          { scene },
          { new: true }
        );
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

        io.to(roomCode).emit("room-state", emptyScene);
        await Room.findOneAndUpdate(
          { code: roomCode.toUpperCase() },
          { scene: emptyScene },
          { new: true }
        );
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