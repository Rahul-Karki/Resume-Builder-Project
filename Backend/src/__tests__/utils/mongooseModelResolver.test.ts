import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { getModelIfRegistered, resolveModelByCollection } from "../../utils/mongooseModelResolver";

const { mockModel, mockModelNames } = vi.hoisted(() => ({
  mockModel: vi.fn(),
  mockModelNames: vi.fn(() => []),
}));

vi.mock("mongoose", () => ({
  default: {
    models: {} as Record<string, any>,
    model: mockModel,
    modelNames: mockModelNames,
  },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("mongooseModelResolver", () => {
  describe("getModelIfRegistered", () => {
    it("should return the model when it is registered", () => {
      (mongoose as any).models["User"] = {};
      mockModel.mockReturnValue({ collection: { collectionName: "users" } });
      const result = getModelIfRegistered("User");
      expect(mockModel).toHaveBeenCalledWith("User");
      expect(result).toBeTruthy();
    });

    it("should return null for unregistered model names", () => {
      const result = getModelIfRegistered("Nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("resolveModelByCollection", () => {
    it("should return the model matching the collection name", () => {
      (mongoose as any).models["User"] = {};
      mockModelNames.mockReturnValue(["User"]);
      mockModel.mockReturnValue({ collection: { collectionName: "users" } });
      const result = resolveModelByCollection("users");
      expect(result).toBeTruthy();
    });

    it("should return null when no model matches the collection", () => {
      mockModelNames.mockReturnValue(["User"]);
      mockModel.mockReturnValue({ collection: { collectionName: "other" } });
      const result = resolveModelByCollection("nonexistent");
      expect(result).toBeNull();
    });
  });
});
