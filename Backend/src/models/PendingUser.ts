import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "../enums/userRole";

export interface IPendingUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  authProvider: string[];
  emailVerificationOtp: string;
  emailVerificationOtpExpires: Date;
  emailVerificationAttempts: number;
  resendAttempts: number;
  lastResendAt: Date | null;
  createdAt: Date;
}

const PendingUserSchema: Schema = new Schema<IPendingUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
  authProvider: { type: [String], default: ["local"] },
  emailVerificationOtp: { type: String, required: true },
  emailVerificationOtpExpires: { type: Date, required: true },
  emailVerificationAttempts: { type: Number, default: 0 },
  resendAttempts: { type: Number, default: 0 },
  lastResendAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: { expireAfterSeconds: 86400 } },
});

export default mongoose.model<IPendingUser>("PendingUser", PendingUserSchema);
