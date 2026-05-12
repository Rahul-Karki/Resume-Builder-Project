import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "../enums/userRole";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // 👈 optional now
  role: UserRole;
  jobsApplied: mongoose.Types.ObjectId[];
  passwordResetAt: Date;
  avatar: string;
  googleId?: string;
  authProvider: string[];
  aiCreditsRemaining: number;
  aiCreditsResetAt: Date;
  aiCreditsPlan: "free" | "basic" | "premium" | "enterprise";
}

const getNextCreditsResetAt = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};

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
      required: function (this: any) {
        return Array.isArray(this.authProvider) && this.authProvider.includes("local");
      },
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
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

    passwordResetAt: {
      type: Date,
    },

    avatar: {
      type: String,
      default: "",
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    authProvider: {
      type: [String],
      enum: ["local", "google"],
      default: [],
    },

    aiCreditsRemaining: {
      type: Number,
      default: 200,
      min: 0,
    },

    aiCreditsResetAt: {
      type: Date,
      default: getNextCreditsResetAt,
    },

    aiCreditsPlan: {
      type: String,
      enum: ["free", "basic", "premium", "enterprise"],
      default: "free",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);