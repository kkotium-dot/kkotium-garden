// Public barrel for the Phase 2-B-1 atelier workbench shell.

export { default as WorkbenchShell } from "./WorkbenchShell";
export type { WorkbenchShellProps } from "./WorkbenchShell";

export { default as WorkbenchCanvas } from "./WorkbenchCanvas";
export type { WorkbenchCanvasProps } from "./WorkbenchCanvas";

export { default as WorkbenchTabs } from "./WorkbenchTabs";
export type { WorkbenchTabsProps, WorkbenchTabKey } from "./WorkbenchTabs";

export { default as AssetDropZone } from "./AssetDropZone";
export type { AssetDropZoneProps, AssetDropZoneState } from "./AssetDropZone";

export { default as FireflyPromptBuilder } from "./FireflyPromptBuilder";
export type {
  FireflyPromptBuilderProps,
  FireflyPromptElements,
} from "./FireflyPromptBuilder";

export { default as AiQueueStepper } from "./AiQueueStepper";
export type { AiQueueStepperProps } from "./AiQueueStepper";

export { default as JobLifecyclePanel } from "./JobLifecyclePanel";
