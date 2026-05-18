import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";

const app = express();

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = [clientUrl, "http://localhost:5174"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Whiteboard server is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);

export default app;