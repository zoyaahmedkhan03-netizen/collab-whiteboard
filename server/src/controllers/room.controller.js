import Room from "../models/Room.js";

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = async (req, res) => {
  try {
    const { title } = req.body;

    let code = generateRoomCode();
    while (await Room.exists({ code })) {
      code = generateRoomCode();
    }

    const room = await Room.create({
      code,
      title: title || "Collaborative Whiteboard",
      host: req.user._id,
      participants: [req.user._id],
    });

    return res.status(201).json({
      success: true,
      room: {
        code: room.code,
        title: room.title,
      },
    });
  } catch (error) {
    console.error("Create room error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error creating room",
    });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(400).json({
        success: false,
        message: "Room code is required",
      });
    }

    const room = await Room.findOne({ code: roomCode.toUpperCase() });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (!room.participants.some((participant) => participant.equals(req.user._id))) {
      room.participants.push(req.user._id);
      await room.save();
    }

    return res.json({
      success: true,
      room: {
        code: room.code,
        title: room.title,
      },
    });
  } catch (error) {
    console.error("Join room error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error joining room",
    });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { code } = req.params;

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.json({
      success: true,
      room: {
        code: room.code,
        title: room.title,
        scene: room.scene,
        participantCount: room.participants.length,
      },
    });
  } catch (error) {
    console.error("Get room error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error getting room",
    });
  }
};
