import express from "express";
import { createRoom, joinRoom, getRoom } from "../controllers/room.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, createRoom);
router.post("/join", protect, joinRoom);
router.get("/:code", protect, getRoom);

export default router;
