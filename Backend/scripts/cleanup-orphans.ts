import mongoose from "mongoose";
import "../src/config/env";
import "../src/models";

async function cleanupOrphans() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;

  // ── Orphaned ResumeVersions ─────────────────────────────────────────
  const resumeIds = await db.collection("resumes").distinct("_id");
  const resumeIdSet = new Set(resumeIds.map((id) => id.toString()));

  const orphanedVersions = await db
    .collection("resumeversions")
    .find({ resumeId: { $nin: resumeIds } })
    .toArray();

  if (orphanedVersions.length > 0) {
    console.log(`Found ${orphanedVersions.length} orphaned ResumeVersion(s):`);
    for (const v of orphanedVersions) {
      console.log(`  - _id: ${v._id}, resumeId: ${v.resumeId}, createdAt: ${v.createdAt}`);
    }
    const result = await db.collection("resumeversions").deleteMany({
      resumeId: { $nin: resumeIds },
    });
    console.log(`Deleted ${result.deletedCount} orphaned ResumeVersion(s)`);
  } else {
    console.log("No orphaned ResumeVersions found");
  }

  // ── Orphaned AtsAnalyses ────────────────────────────────────────────
  const atsResumeIds = await db.collection("atsanalyses").distinct("resumeId");
  const orphanedAts: any[] = [];
  for (const rid of atsResumeIds) {
    if (!resumeIdSet.has(rid.toString())) {
      orphanedAts.push(rid);
    }
  }

  if (orphanedAts.length > 0) {
    console.log(`Found ${orphanedAts.length} orphaned AtsAnalyses`);
    const result = await db.collection("atsanalyses").deleteMany({
      resumeId: { $nin: resumeIds },
    });
    console.log(`Deleted ${result.deletedCount} orphaned AtsAnalyses`);
  } else {
    console.log("No orphaned AtsAnalyses found");
  }

  // ── Orphaned AiUsages ───────────────────────────────────────────────
  const userIds = await db.collection("users").distinct("_id");
  const userIdSet = new Set(userIds.map((id) => id.toString()));

  const orphanedUsage = await db.collection("aiusages").find({
    userId: { $nin: userIds },
  }).toArray();

  if (orphanedUsage.length > 0) {
    console.log(`Found ${orphanedUsage.length} orphaned AiUsage(s)`);
    const result = await db.collection("aiusages").deleteMany({
      userId: { $nin: userIds },
    });
    console.log(`Deleted ${result.deletedCount} orphaned AiUsage(s)`);
  } else {
    console.log("No orphaned AiUsages found");
  }

  await mongoose.disconnect();
  console.log("Cleanup complete");
}

cleanupOrphans().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
