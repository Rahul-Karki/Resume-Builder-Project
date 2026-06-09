import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "../enums/userRole";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  jobsApplied: mongoose.Types.ObjectId[];
  passwordResetAt: Date;
  avatar: string;
  googleId?: string;
  authProvider: string[];
  aiCreditsRemaining: number;
  aiCreditsResetAt: Date;
  aiCreditsPlan?: string;
  dailyUsage: {
    date: string;
    aiAssistant: number;
    atsScore: number;
  };
  // MFA fields
  mfaEnabled: boolean;
  mfaMethod: "totp" | "none";
  mfaSecret: string | null;
  mfaBackupCodes: string[];
  mfaVerifiedAt: Date | null;
  // Account lockout fields
  loginAttempts: number;
  lockUntil: Date | null;
  // Email verification
  emailVerified: boolean;
  emailVerificationOtp?: string | null;
  emailVerificationOtpExpires?: Date | null;
  emailVerificationAttempts: number;
  tokenVersion: number;
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
          ref: "Resume",
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

    dailyUsage: {
      date: { type: String, default: "" },
      aiAssistant: { type: Number, default: 0 },
      atsScore: { type: Number, default: 0 },
    },

    // MFA fields
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaMethod: {
      type: String,
      enum: ["totp", "none"],
      default: "none",
    },
    mfaSecret: {
      type: String,
      default: null,
    },
    mfaBackupCodes: {
      type: [String],
      default: [],
      select: false,
    },
    mfaVerifiedAt: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOtp: {
      type: String,
      default: null,
    },
    emailVerificationOtpExpires: {
      type: Date,
      default: null,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Clamp aiCreditsRemaining to 0 to prevent validation errors on unrelated saves
UserSchema.pre("save", function () {
  if (this.isModified("aiCreditsRemaining") && typeof this.aiCreditsRemaining === "number" && this.aiCreditsRemaining < 0) {
    this.aiCreditsRemaining = 0;
  }
});

export default mongoose.model<IUser>("User", UserSchema);