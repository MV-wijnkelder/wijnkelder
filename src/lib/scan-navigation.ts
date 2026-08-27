export type LabelSide = "front" | "back";
export type PhotoSource = "Camera" | "Library";
export type ScanStage = "start" | "front" | "back-choice" | "back" | "warning" | "review";

export function stageForPhotoPicker(side: LabelSide, source: PhotoSource): ScanStage {
  // iOS briefly reveals the page already rendered behind its native camera UI.
  // Stage the camera's destination before opening it so accepting a front photo
  // cannot expose the otherwise-empty front-label step during that handoff.
  if (side === "front" && source === "Camera") return "back-choice";
  return side;
}
