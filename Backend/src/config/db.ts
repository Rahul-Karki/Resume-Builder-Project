import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../observability";

const connectDB = async () => {
    try{
        await mongoose.connect(env.MONGO_URI, {
            minPoolSize: 10,
            maxPoolSize: 100,
        });
        logger.info("MongoDB connected");
    }catch(error){
        logger.error({ error }, "MongoDB connection failed");
        process.exit(1);
    }
};

export default connectDB;