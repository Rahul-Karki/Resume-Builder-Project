import express from "express";
import connectDB from "./config/db";
import User from "./models/User";
import dotenv from "dotenv"
import cors from "cors";

dotenv.config();
const app = express();

app.use(express.json());
connectDB();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // if using cookies/auth
  })
);

import authRoutes from "./router/auth.routes";
import refreshRoutes from "./router/refresh.route";
import resumeRoutes from "./router/resume.routes";
import adminRoutes from "./router/admin.routes";

app.use("/api/auth",authRoutes);
app.use("/api",refreshRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/admin", adminRoutes);

 
app.listen(process.env.PORT, () => {
  console.log("Server running");
});

