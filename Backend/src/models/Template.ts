import mongoose, { Document, Schema } from "mongoose";

export interface ITemplate extends Document {
  name: string;
  previewImage: string;
  htmlLayout: string;
  cssStyles: string;
  sections: string[];
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: true,
    },
    previewImage: {
      type: String,
    },

    htmlLayout: {
      type: String,
      required: true,
    },

    cssStyles: {
      type: String,
    },

    sections: {
      type: [String],
      default: [],
    },

    isPremium: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model<ITemplate>("Template", TemplateSchema);