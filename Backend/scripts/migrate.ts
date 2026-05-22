import "../src/config/env";
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { runMigrations, rollbackLastMigration } from "../src/migrations/runner";

const command = process.argv[2] ?? "up";
const targetId = process.argv[3];

async function main() {
  await mongoose.connect(env.MONGO_URI);

  try {
    if (command === "down") {
      await rollbackLastMigration();
    } else {
      await runMigrations(targetId);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
