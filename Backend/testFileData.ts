import mongoose from "mongoose";
import ResumeDownloadJob from "./src/models/ResumeDownloadJob";
import { env } from "./src/config/env";

declare var Buffer: any;
declare var process: any;

const toBuffer = (value: unknown): any | null => {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    // Handle MongoDB Binary BSON type: { type: 0, data: [...] }
    if (Array.isArray(record.data)) {
      return Buffer.from(record.data as number[]);
    }

    // Handle nested buffer objects
    if (record.buffer instanceof ArrayBuffer) {
      return Buffer.from(record.buffer);
    }

    if (Buffer.isBuffer(record.buffer)) {
      return record.buffer;
    }

    // Handle string base64 encoding
    if (typeof record.data === "string") {
      try {
        return Buffer.from(record.data, "base64");
      } catch {
        // Ignore conversion errors
      }
    }
  }

  return null;
};

async function main() {
  await mongoose.connect(env!.MONGO_URI);
  const job = await ResumeDownloadJob.findOne({ status: "completed" }).lean();
  if (!job) {
    console.log("No completed job found");
    return;
  }
  const rawFileData = job.fileData;
  console.log("rawFileData type:", typeof rawFileData);
  console.log("isBuffer:", Buffer.isBuffer(rawFileData));
  console.log("keys:", rawFileData ? Object.keys(rawFileData) : null);
  console.log("constructor:", rawFileData ? rawFileData.constructor.name : null);
  
  if (rawFileData && typeof rawFileData === "object") {
    const record = rawFileData as Record<string, unknown>;
    console.log("record.buffer instanceof ArrayBuffer:", record.buffer instanceof ArrayBuffer);
    console.log("Buffer.isBuffer(record.buffer):", Buffer.isBuffer(record.buffer));
    console.log("record.buffer constructor:", record.buffer ? record.buffer.constructor.name : null);
  }

  const buf = toBuffer(rawFileData);
  console.log("toBuffer result:", buf ? "Buffer of length " + buf.length : null);
  process.exit(0);
}

main().catch(console.error);
