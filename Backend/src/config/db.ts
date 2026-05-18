import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../observability";
import softDeletePlugin from "../models/plugins/softDelete";
import auditTrailPlugin from "../models/plugins/auditTrail";
import cascadeDeletePlugin from "../models/plugins/cascadeDelete";

// Apply global plugins immediately upon file import
// This ensures they are registered before any models are imported/evaluated in server.ts
mongoose.plugin(softDeletePlugin as any);
mongoose.plugin(auditTrailPlugin as any);

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