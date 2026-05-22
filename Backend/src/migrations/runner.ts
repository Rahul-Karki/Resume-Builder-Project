import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { logger } from "../observability";
import { Migration } from "./types";

const MIGRATIONS_DIR = path.resolve(__dirname);

const MigrationRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  executedAt: { type: Date, default: Date.now },
  durationMs: { type: Number, required: true },
});

const MigrationRecord = mongoose.model("MigrationRecord", MigrationRecordSchema);

const loadMigrations = (): Migration[] => {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .filter((f) => f !== "runner.ts" && f !== "runner.js")
    .sort();

  const migrations: Migration[] = [];

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const mod = require(filePath);
      if (mod.default) {
        migrations.push(mod.default);
      }
    } catch (error: any) {
      logger.error({ file, error: error.message }, "Failed to load migration");
    }
  }

  return migrations.sort((a, b) => a.id.localeCompare(b.id));
};

export const runMigrations = async (targetId?: string) => {
  const pending = loadMigrations();
  const executed = await MigrationRecord.find().sort({ id: 1 }).lean();
  const executedIds = new Set(executed.map((r) => r.id));

  const toRun = targetId
    ? pending.filter((m) => m.id <= targetId && !executedIds.has(m.id))
    : pending.filter((m) => !executedIds.has(m.id));

  if (toRun.length === 0) {
    logger.info("No pending migrations");
    return;
  }

  for (const migration of toRun) {
    const start = Date.now();
    try {
      logger.info({ id: migration.id, description: migration.description }, "Running migration");
      await migration.up();
      const durationMs = Date.now() - start;
      await MigrationRecord.create({
        id: migration.id,
        description: migration.description,
        durationMs,
      });
      logger.info({ id: migration.id, durationMs }, "Migration completed");
    } catch (error: any) {
      logger.error({ id: migration.id, error: error.message }, "Migration failed");
      throw error;
    }
  }
};

export const rollbackLastMigration = async () => {
  const last = await MigrationRecord.findOne().sort({ executedAt: -1 });
  if (!last) {
    logger.info("No migrations to rollback");
    return;
  }

  const migrations = loadMigrations();
  const migration = migrations.find((m) => m.id === last.id);

  if (!migration?.down) {
    logger.error({ id: last.id }, "Migration has no down function");
    return;
  }

  try {
    logger.info({ id: migration.id, description: migration.description }, "Rolling back migration");
    await migration.down();
    await MigrationRecord.deleteOne({ _id: last._id });
    logger.info({ id: migration.id }, "Rollback completed");
  } catch (error: any) {
    logger.error({ id: migration.id, error: error.message }, "Rollback failed");
    throw error;
  }
};
