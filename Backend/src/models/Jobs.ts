import mongoose , { Schema, Document } from "mongoose";

export interface IJobs extends Document{
    recruiterId: mongoose.Types.ObjectId;
    title: string;
    company: string;
    description: string;
    skills: string[];
}

const JobSchema : Schema = new Schema<IJobs>(
    {
        recruiterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        company: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        skills: [{
            type: String,
            required: true,
        }],
    },{timestamps : true}
);

export default mongoose.model<IJobs>("Job",JobSchema);

// later add indexes