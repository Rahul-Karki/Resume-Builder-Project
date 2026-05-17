import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../observability";
import softDeletePlugin from "../models/plugins/softDelete";

const connectDB = async () => {
    try{
        // apply global plugins
        mongoose.plugin(softDeletePlugin as any);

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