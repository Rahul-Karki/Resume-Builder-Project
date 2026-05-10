import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getResumeQueue } from "../queue/resumeQueue";
import { getAtsQueue } from "../queue/atsQueue";

export const setupBullBoard = () => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(getResumeQueue()),
      new BullMQAdapter(getAtsQueue()),
    ],
    serverAdapter,
  });

  return serverAdapter.getRouter();
};
