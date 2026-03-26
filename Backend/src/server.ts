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

app.use("/api/auth",authRoutes);
app.use("/api",refreshRoutes);
 // app.use("/api/users", userRoutes);

 
app.listen(process.env.PORT, () => {
  console.log("Server running");
});

