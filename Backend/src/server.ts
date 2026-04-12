import express from "express";
import connectDB from "./config/db";
import User from "./models/User";
import dotenv from "dotenv"
import cors from "cors";

dotenv.config();
const app = express();

app.use(express.json());
connectDB();

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: corsOrigin.split(",").map(url => url.trim()),
    credentials: true, // if using cookies/auth
  })
);

import authRoutes from "./router/auth.routes";
import refreshRoutes from "./router/refresh.route";
import resumeRoutes from "./router/resume.routes";
import adminRoutes from "./router/admin.routes";
import templateRoutes from "./router/template.routes";

app.use("/api/auth",authRoutes);
app.use("/api",refreshRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/templates", templateRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

