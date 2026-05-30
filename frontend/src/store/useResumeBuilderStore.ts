import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { DocumentSlice, createDocumentSlice } from "./slices/documentSlice";
import { UISlice, createUISlice } from "./slices/uiSlice";
import { PersistenceSlice, createPersistenceSlice } from "./slices/persistenceSlice";

export type ResumeBuilderStore = DocumentSlice & UISlice & PersistenceSlice;

export const useResumeBuilderStore = create<ResumeBuilderStore>()(
  subscribeWithSelector(immer((...a) => ({
    ...createDocumentSlice(a[0], a[1]),
    ...createUISlice(a[0]),
    ...createPersistenceSlice(a[0], a[1]),
  }))),
);
