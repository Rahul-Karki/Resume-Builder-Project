import {
  BuilderUIState, ActiveSection, EditorTab, FocusedEditorField, PreviewScale, ExportPreset,
} from "@/types/resume-types";

export const initialUI: BuilderUIState = {
  activeTab: "content",
  activeSection: "personal",
  focusedField: null,
  previewScale: 0.5,
  exportPreset: "standard",
  isSaving: false,
  isSaved: false,
  isDirty: false,
  saveError: null,
};

export interface UISlice {
  ui: BuilderUIState;
  setActiveTab: (tab: EditorTab) => void;
  setActiveSection: (section: ActiveSection) => void;
  setFocusedField: (field: FocusedEditorField | null) => void;
  setPreviewScale: (scale: PreviewScale) => void;
  setExportPreset: (preset: ExportPreset) => void;
}

export function createUISlice(set: any): UISlice {
  return {
    ui: { ...initialUI },

    setActiveTab: (tab: EditorTab) => set((state: any) => { state.ui.activeTab = tab; }),
    setActiveSection: (section: ActiveSection) => set((state: any) => { state.ui.activeSection = section; }),
    setFocusedField: (field: FocusedEditorField | null) => set((state: any) => { state.ui.focusedField = field; }),
    setPreviewScale: (scale: PreviewScale) => set((state: any) => { state.ui.previewScale = scale; }),
    setExportPreset: (preset: ExportPreset) => set((state: any) => { state.ui.exportPreset = preset; }),
  };
}
