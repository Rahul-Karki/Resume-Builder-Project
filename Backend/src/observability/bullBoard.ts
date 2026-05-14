import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getResumeQueue, getResumeQueueRuntimeInfo } from "../queue/resumeQueue";
import { getAtsQueueRuntimeInfo } from "../queue/atsQueue";

export const setupBullBoard = () => {
  const resumeInfo = getResumeQueueRuntimeInfo();
  const atsInfo = getAtsQueueRuntimeInfo();

  // If queues are disabled (synchronous mode), return a simple router indicating Bull Board is unavailable
  if (!resumeInfo.enabled && !atsInfo.enabled) {
    const r = express.Router();
    r.use((req, res) => res.status(404).send("Bull board disabled"));
    return r;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  const queues: any[] = [];
  if (resumeInfo.enabled) queues.push(new BullMQAdapter(getResumeQueue() as any));
  if (atsInfo.enabled) queues.push(new BullMQAdapter((getResumeQueue() as any)));

  createBullBoard({
    queues,
    serverAdapter,
  });

  return serverAdapter.getRouter();
};
