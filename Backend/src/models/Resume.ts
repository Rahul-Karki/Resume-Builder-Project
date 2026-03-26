import mongoose, { Schema , Document } from "mongoose";

interface IEducation {
  school: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  grade?: string;
}

interface IExperience {
  company: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  description: string[];
}

interface IProject {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

interface IPersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  personalInfo: IPersonalInfo;
  summary: string;
  education: IEducation[];
  experience: IExperience[];
  projects: IProject[];
  skills: string[];
  templateId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    personalInfo: {
      fullName: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      github: String,
      portfolio: String,
    },

    summary: {
        type: String,
        default: " ",
    },

    education: {
      type: [
        {
          school: String,
          degree: String,
          field: String,
          startDate: Date,
          endDate: Date,
          grade: String,
        },
      ],
      default: [],
    },

    experience: {
      type: [
        {
          company: String,
          role: String,
          startDate: Date,
          endDate: Date,
          description: [String],
        },
      ],
      default: [],
    },
    projects: {
      type: [
        {
          name: String,
          description: String,
          technologies: [String],
          link: String,
        },
      ],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IResume>("Resume", ResumeSchema);
