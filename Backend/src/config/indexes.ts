/**
 * MongoDB Indexes Documentation & Setup
 * 
 * This file documents all MongoDB indexes and provides functions to create them.
 * 
 * Why indexes matter:
 * - Significantly speed up queries
 * - Reduce disk I/O and memory usage
 * - Critical for production workloads
 * - Should be created during deployment
 */

import mongoose from "mongoose";

/**
 * Index definitions with analysis
 */
export const INDEX_DEFINITIONS = {
  // ═════════════════════════════════════════════════════════════════
  // USER COLLECTION INDEXES
  // ═════════════════════════════════════════════════════════════════
  User: {
    email: {
      spec: { email: 1 },
      options: { unique: true },
      reason:
        "Email is unique identifier; used in login queries. " +
        "Query: User.findOne({ email })",
      estimatedDocs: 10000,
      selectivity: "high",
    },
    createdAt: {
      spec: { createdAt: -1 },
      options: {},
      reason:
        "Sort users by creation date for analytics/pagination. " +
        "Query: User.find().sort({ createdAt: -1 })",
      estimatedDocs: 10000,
      selectivity: "low",
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RESUME COLLECTION INDEXES
  // ═════════════════════════════════════════════════════════════════
  Resume: {
    userId: {
      spec: { userId: 1 },
      options: {},
      reason:
        "Critical for listing user's resumes. " +
        "Query: Resume.find({ userId })",
      estimatedDocs: 100000,
      selectivity: "medium",
      cardinality: "HIGH",
      expectedHitRate: "95%",
    },
    userId_createdAt: {
      spec: { userId: 1, createdAt: -1 },
      options: {},
      reason:
        "Compound index for: list user resumes + sort by date. " +
        "Query: Resume.find({ userId }).sort({ createdAt: -1 }).limit(20)",
      estimatedDocs: 100000,
      selectivity: "high",
      expectedHitRate: "98%",
      note: "Covers both filter and sort in single index scan",
    },
    templateId: {
      spec: { templateId: 1 },
      options: {},
      reason:
        "For analytics: count resumes per template. " +
        "Query: Resume.find({ templateId }).count()",
      estimatedDocs: 100000,
      selectivity: "medium",
    },
    updatedAt: {
      spec: { updatedAt: -1 },
      options: {},
      reason:
        "Sort resumes by recently modified for activity feeds. " +
        "Query: Resume.find().sort({ updatedAt: -1 })",
      estimatedDocs: 100000,
      selectivity: "low",
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RESUME VERSION COLLECTION INDEXES
  // ═════════════════════════════════════════════════════════════════
  ResumeVersion: {
    resumeId: {
      spec: { resumeId: 1 },
      options: {},
      reason:
        "Critical for version history: fetch all versions of a resume. " +
        "Query: ResumeVersion.find({ resumeId }).sort({ createdAt: -1 })",
      estimatedDocs: 500000,
      selectivity: "medium",
      expectedHitRate: "95%",
    },
    resumeId_createdAt: {
      spec: { resumeId: 1, createdAt: -1 },
      options: {},
      reason:
        "Fetch version history in chronological order. " +
        "Query: ResumeVersion.find({ resumeId }).sort({ createdAt: -1 })",
      estimatedDocs: 500000,
      selectivity: "high",
      note: "Covers filter and sort in single scan",
    },
    userId: {
      spec: { userId: 1 },
      options: {},
      reason:
        "For auditing: find all versions by user. " +
        "Query: ResumeVersion.find({ userId })",
      estimatedDocs: 500000,
      selectivity: "medium",
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // TEMPLATE COLLECTION INDEXES
  // ═════════════════════════════════════════════════════════════════
  Template: {
    isPublished: {
      spec: { isPublished: 1 },
      options: {},
      reason:
        "Filter published templates for templates page. " +
        "Query: Template.find({ isPublished: true })",
      estimatedDocs: 50,
      selectivity: "low",
      note: "Small collection, but important for user-facing queries",
    },
    createdAt: {
      spec: { createdAt: -1 },
      options: {},
      reason: "Sort templates by date (newest first)",
      estimatedDocs: 50,
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // TEMPLATE USAGE COLLECTION INDEXES
  // ═════════════════════════════════════════════════════════════════
  TemplateUsage: {
    templateId: {
      spec: { templateId: 1 },
      options: {},
      reason:
        "Analytics: count how many times each template is used. " +
        "Query: TemplateUsage.countDocuments({ templateId })",
      estimatedDocs: 1000000,
      selectivity: "medium",
    },
    userId: {
      spec: { userId: 1 },
      options: {},
      reason:
        "Track which templates a user has used. " +
        "Query: TemplateUsage.find({ userId })",
      estimatedDocs: 1000000,
      selectivity: "medium",
    },
    templateId_usedAt: {
      spec: { templateId: 1, usedAt: -1 },
      options: {},
      reason:
        "Analytics dashboard: popular templates by usage date. " +
        "Query: TemplateUsage.find({ templateId }).sort({ usedAt: -1 })",
      estimatedDocs: 1000000,
      selectivity: "high",
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RESET TOKEN COLLECTION INDEXES
  // ═════════════════════════════════════════════════════════════════
  ResetToken: {
    token: {
      spec: { token: 1 },
      options: { sparse: true },
      reason:
        "Lookup reset token by hash during password reset. " +
        "Query: ResetToken.findOne({ token })",
      estimatedDocs: 10000,
      selectivity: "high",
      note: "Sparse: only exists for reset tokens, not other records",
    },
    userId: {
      spec: { userId: 1 },
      options: { sparse: true },
      reason:
        "Find active reset tokens for a user (prevent token reuse). " +
        "Query: ResetToken.findOne({ userId, expiresAt: { $gt: now } })",
      estimatedDocs: 10000,
    },
    expiresAt: {
      spec: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
      reason:
        "TTL index: auto-delete expired reset tokens. " +
        "MongoDB automatically removes docs after expiresAt",
      estimatedDocs: 10000,
      note: "TTL index: critical for data cleanup",
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // ATS ANALYSIS COLLECTION INDEXES
  // ═════════════════════════════════════════════════════════════════
  AtsAnalysis: {
    resumeId: {
      spec: { resumeId: 1 },
      options: { unique: true },
      reason:
        "Fetch ATS analysis for a resume. One analysis per resume. " +
        "Query: AtsAnalysis.findOne({ resumeId })",
      estimatedDocs: 10000,
      selectivity: "high",
    },
    score: {
      spec: { score: -1 },
      options: {},
      reason:
        "Sort/filter resumes by ATS score for insights. " +
        "Query: AtsAnalysis.find({ score: { $gte: 80 } }).sort({ score: -1 })",
      estimatedDocs: 10000,
      selectivity: "medium",
    },
  },
};

/**
 * Create all indexes in MongoDB
 * Run once during deployment or migration
 */
export async function createAllIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection not established");
    }

    console.log("Creating MongoDB indexes...");

    for (const [collectionName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
      const collection = db.collection(collectionName);

      for (const [indexName, indexDef] of Object.entries(indexes)) {
        try {
          await collection.createIndex(indexDef.spec, indexDef.options);
          console.log(
            `✓ Created index '${indexName}' on '${collectionName}': ${JSON.stringify(indexDef.spec)}`
          );
        } catch (error) {
          // Ignore "index already exists" errors
          if ((error as any).code !== 85) {
            console.error(
              `✗ Failed to create index '${indexName}' on '${collectionName}':`,
              error
            );
          }
        }
      }
    }

    console.log("Index creation complete");
  } catch (error) {
    console.error("Error creating indexes:", error);
    throw error;
  }
}

/**
 * List all indexes for a collection
 */
export async function listCollectionIndexes(collectionName: string) {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection not established");
    }

    const collection = db.collection(collectionName);
    const indexes = await collection.listIndexes().toArray();

    console.log(`\nIndexes for collection '${collectionName}':`);
    console.table(indexes);

    return indexes;
  } catch (error) {
    console.error(`Error listing indexes for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get index statistics for performance analysis
 */
export async function getIndexStats(collectionName: string) {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection not established");
    }

    const stats = await db
      .collection(collectionName)
      .aggregate([{ $indexStats: {} }])
      .toArray();

    console.log(`\nIndex statistics for '${collectionName}':`);
    stats.forEach((stat) => {
      console.log(`  ${stat.name.name}:`, {
        accesses: stat.accesses.ops,
        since: stat.accesses.since,
      });
    });

    return stats;
  } catch (error) {
    console.error(`Error getting index stats for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Drop an index
 * Use with caution!
 */
export async function dropIndex(collectionName: string, indexName: string) {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection not established");
    }

    const collection = db.collection(collectionName);
    await collection.dropIndex(indexName);

    console.log(`✓ Dropped index '${indexName}' from '${collectionName}'`);
  } catch (error) {
    console.error(
      `Error dropping index '${indexName}' from '${collectionName}':`,
      error
    );
    throw error;
  }
}

/**
 * Export index summary for documentation
 */
export function printIndexSummary() {
  console.log("\n╔═══════════════════════════════════════════════════════════════╗");
  console.log("║           MongoDB Indexes Summary                            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  for (const [collectionName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
    console.log(`\n📦 ${collectionName}`);
    console.log("─".repeat(60));

    for (const [indexName, indexDef] of Object.entries(indexes)) {
      console.log(`  📌 ${indexName}`);
      console.log(`     Spec: ${JSON.stringify(indexDef.spec)}`);
      console.log(`     Reason: ${indexDef.reason}`);
      console.log(
        `     Selectivity: ${(indexDef as any).selectivity || "unknown"}`
      );
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`Total indexes: ${Object.values(INDEX_DEFINITIONS).reduce((sum, collection) => sum + Object.keys(collection).length, 0)}`);
  console.log("═".repeat(60) + "\n");
}
