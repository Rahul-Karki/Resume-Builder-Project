import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../observability";

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {
      minPoolSize: 5,
      maxPoolSize: 50,
    });
    logger.info("Worker MongoDB connected");
  } catch (error) {
    logger.error({ error }, "Worker MongoDB connection failed");
    process.exit(1);
  }
};

export default connectDB;
