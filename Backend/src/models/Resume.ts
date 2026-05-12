import mongoose, { Schema , Document } from "mongoose";

interface IWorkEntry {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  current: boolean;
  contentMode: "bullets" | "paragraph";
  description: string;
  bullets: string[];
}

interface IEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
  cgpa: string;
}

interface ISkillGroup {
  id: string;
  category: string;
  items: string[];
}

interface IProject {
  id: string;
  name: string;
  contentMode: "bullets" | "paragraph";
  description: string;
  bullets: string[];
  tech: string;
  link: string;
}

interface ICertification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

interface ILanguage {
  id: string;
  language: string;
  proficiency: "Native" | "Fluent" | "Advanced" | "Intermediate" | "Basic";
}

interface IPersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
}

interface ISections {
  experience: IWorkEntry[];
  education: IEducation[];
  skills: ISkillGroup[];
  projects: IProject[];
  certifications: ICertification[];
  languages: ILanguage[];
}

interface IStyle {
  accentColor: string;
  headingColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
  bodyFont: string;
  headingFont: string;
  fontSize: "9pt" | "9.5pt" | "10pt" | "10.5pt" | "11pt" | "11.5pt";
  lineHeight: "1.3" | "1.4" | "1.5" | "1.6" | "1.7";
  pageMargin: "tight" | "normal" | "relaxed" | "spacious";
  sectionSpacing: "compact" | "normal" | "loose";
  showDividers: boolean;
  bulletStyle: "•" | "–" | "›" | "▸" | "◦";
  headerAlign: "left" | "center";
}

interface ISectionVisibility {
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  certifications: boolean;
  languages: boolean;
}

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  baseResumeId?: mongoose.Types.ObjectId;
  isVariant?: boolean;
  variantLabel?: string;
  targetRole?: string;
  title: string;
  templateId: string;
  personalInfo: IPersonalInfo;
  sections: ISections;
  style: IStyle;
  sectionOrder: Array<"experience" | "education" | "skills" | "projects" | "certifications" | "languages">;
  sectionVisibility: ISectionVisibility;
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

    baseResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: undefined,
    },

    isVariant: {
      type: Boolean,
      default: false,
    },

    variantLabel: {
      type: String,
      default: "",
    },

    targetRole: {
      type: String,
      default: "",
    },

    title: {
      type: String,
      required: true,
    },

    templateId: {
      type: String,
      required: true,
      default: "classic",
    },

    personalInfo: {
      name: { type: String, default: "" },
      title: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      portfolio: { type: String, default: "" },
      summary: { type: String, default: "" },
    },

    sections: {
      experience: {
        type: [
          {
            id: { type: String, required: true },
            company: { type: String, default: "" },
            role: { type: String, default: "" },
            start: { type: String, default: "" },
            end: { type: String, default: "" },
            location: { type: String, default: "" },
            current: { type: Boolean, default: false },
            contentMode: { type: String, enum: ["bullets", "paragraph"], default: "bullets" },
            description: { type: String, default: "" },
            bullets: { type: [String], default: [] },
          },
        ],
        default: [],
      },
      education: {
        type: [
          {
            id: { type: String, required: true },
            institution: { type: String, default: "" },
            degree: { type: String, default: "" },
            field: { type: String, default: "" },
            year: { type: String, default: "" },
            cgpa: { type: String, default: "" },
          },
        ],
        default: [],
      },
      skills: {
        type: [
          {
            id: { type: String, required: true },
            category: { type: String, default: "" },
            items: { type: [String], default: [] },
          },
        ],
        default: [],
      },
      projects: {
        type: [
          {
            id: { type: String, required: true },
            name: { type: String, default: "" },
            contentMode: { type: String, enum: ["bullets", "paragraph"], default: "paragraph" },
            description: { type: String, default: "" },
            bullets: { type: [String], default: [] },
            tech: { type: String, default: "" },
            link: { type: String, default: "" },
          },
        ],
        default: [],
      },
      certifications: {
        type: [
          {
            id: { type: String, required: true },
            name: { type: String, default: "" },
            issuer: { type: String, default: "" },
            year: { type: String, default: "" },
          },
        ],
        default: [],
      },
      languages: {
        type: [
          {
            id: { type: String, required: true },
            language: { type: String, default: "" },
            proficiency: {
              type: String,
              enum: ["Native", "Fluent", "Advanced", "Intermediate", "Basic"],
              default: "Intermediate",
            },
          },
        ],
        default: [],
      },
    },

    style: {
      accentColor: { type: String, default: "#1a1a1a" },
      headingColor: { type: String, default: "#111111" },
      textColor: { type: String, default: "#333333" },
      mutedColor: { type: String, default: "#666666" },
      borderColor: { type: String, default: "#cccccc" },
      backgroundColor: { type: String, default: "#ffffff" },
      bodyFont: { type: String, default: "EB Garamond, serif" },
      headingFont: { type: String, default: "EB Garamond, serif" },
      fontSize: { type: String, enum: ["9pt", "9.5pt", "10pt", "10.5pt", "11pt", "11.5pt"], default: "10.5pt" },
      lineHeight: { type: String, enum: ["1.3", "1.4", "1.5", "1.6", "1.7"], default: "1.5" },
      pageMargin: { type: String, enum: ["tight", "normal", "relaxed", "spacious"], default: "normal" },
      sectionSpacing: { type: String, enum: ["compact", "normal", "loose"], default: "normal" },
      showDividers: { type: Boolean, default: true },
      bulletStyle: { type: String, enum: ["•", "–", "›", "▸", "◦"], default: "•" },
      headerAlign: { type: String, enum: ["left", "center"], default: "left" },
    },

    sectionOrder: {
      type: [
        {
          type: String,
          enum: ["experience", "education", "skills", "projects", "certifications", "languages"],
        },
      ],
      default: ["experience", "education", "skills", "projects", "certifications", "languages"],
    },

    sectionVisibility: {
      experience: { type: Boolean, default: true },
      education: { type: Boolean, default: true },
      skills: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      certifications: { type: Boolean, default: true },
      languages: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export default mongoose.model<IResume>("Resume", ResumeSchema);
