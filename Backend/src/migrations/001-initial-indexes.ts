import { createAllIndexes } from "../config/indexes";
import { Migration } from "./types";

const migration: Migration = {
  id: "001-initial-indexes",
  description: "Create all MongoDB indexes defined in config/indexes.ts",
  up: async () => {
    await createAllIndexes();
  },
  down: async () => {
    // Index removal is destructive; skip for safety
  },
};

export default migration;
