import ResumeVersion from "../models/ResumeVersion";

type VersionableResume = {
  _id: unknown;
  userId: unknown;
  title?: string;
  toObject?: () => Record<string, unknown>;
};

export const createResumeVersion = async (
  resume: VersionableResume,
  note = "",
) => {
  const resumeId = String(resume._id);
  const userId = String(resume.userId);

  const latest = await ResumeVersion.findOne({ resumeId }).sort({ versionNo: -1 }).select("versionNo").lean();
  const nextVersionNo = (latest?.versionNo ?? 0) + 1;

  const snapshot = typeof resume.toObject === "function"
    ? resume.toObject()
    : { ...resume };

  await ResumeVersion.create({
    resumeId,
    userId,
    versionNo: nextVersionNo,
    snapshot,
    note,
  });

  return nextVersionNo;
};
