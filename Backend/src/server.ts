import express from "express";
import connectDB from "./config/db";
import User from "./models/User";
import dotenv from "dotenv"


dotenv.config();
const app = express();

app.use(express.json());
connectDB();

import authRoutes from "./router/auth.routes";

app.use("/api/auth",authRoutes);

app.listen(5000, () => {
  console.log("Server running");
});
