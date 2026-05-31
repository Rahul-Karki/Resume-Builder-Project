import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../observability";

// Global plugins are registered in models/index.ts (which must be imported before any model is used)

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];
const MAX_ATTEMPTS = RETRY_DELAYS.length;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async (attempt = 1): Promise<void> => {
    try{
        await mongoose.connect(env.MONGO_URI, {
            minPoolSize: 10,
            maxPoolSize: 100,
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        logger.info("MongoDB connected");
    }catch(error){
        if (attempt < MAX_ATTEMPTS) {
            logger.warn({ error, attempt }, `MongoDB connection failed, retrying in ${RETRY_DELAYS[attempt - 1]}ms...`);
            await sleep(RETRY_DELAYS[attempt - 1]);
            return connectDB(attempt + 1);
        }
        logger.error({ error }, "MongoDB connection failed after all retries");
        process.exit(1);
    }
};

export default connectDB;