import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import teacherRoutes from "./routes/teacher.js";
import studentRoutes from "./routes/student.js";
import hodRoutes from "./routes/hod.js";
import principalRoutes from "./routes/principal.js";

const app = express();

// In production, either set CORS_ORIGIN directly to your frontend's full
// URL (comma-separate multiple origins if needed), e.g.
// CORS_ORIGIN=https://rollcall-frontend.onrender.com
// ...or, if deployed via the render.yaml Blueprint, FRONTEND_HOST is wired
// automatically and we build the full origin from it.
let corsOrigin = "*";
if (process.env.CORS_ORIGIN) {
  corsOrigin = process.env.CORS_ORIGIN.split(",").map((s) => s.trim());
} else if (process.env.FRONTEND_HOST) {
  corsOrigin = `https://${process.env.FRONTEND_HOST}`;
}
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/principal", principalRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Attendance backend running on http://localhost:${PORT}`));
