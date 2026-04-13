import express from "express";
import connectDB from "./config/db";
import dotenv from "dotenv"
import cors from "cors";

dotenv.config();
const app = express();
app.set("trust proxy", 1);

app.use(express.json());
connectDB();


const corsOptions: cors.CorsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));

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

