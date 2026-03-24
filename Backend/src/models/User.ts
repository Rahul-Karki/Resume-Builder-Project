import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "../enums/userRole";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  jobsApplied: mongoose.Types.ObjectId[];
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole), // extracts all the values of an object
      default: UserRole.USER,
      required: true,
    },
    jobsApplied: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Job",
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
