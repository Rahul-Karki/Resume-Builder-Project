import mongoose, { type Model } from "mongoose";

type AnyModel = Model<any>;

const normalize = (value: string) => value.trim().toLowerCase();

export const getModelIfRegistered = (modelName: string): AnyModel | null => {
  if (!modelName) return null;
  if (!mongoose.models[modelName]) return null;
  return mongoose.model(modelName) as AnyModel;
};

export const resolveModelByCollection = (collectionName: string): AnyModel | null => {
  const target = normalize(collectionName);

  for (const name of mongoose.modelNames()) {
    const model = mongoose.model(name) as AnyModel;
    const collection = model.collection?.collectionName;
    if (collection && normalize(collection) === target) {
      return model;
    }
  }

  const fallbackName = collectionName
    ? collectionName.charAt(0).toUpperCase() + collectionName.slice(1)
    : "";

  return getModelIfRegistered(fallbackName);
};
