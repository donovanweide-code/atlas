export type SequentialStepState = "COMPLETED" | "CURRENT" | "LATER" | "UNKNOWN";

export function sequentialStepState<T extends { id: string }>(
  steps: readonly T[],
  stepId: string,
  isCompleted: (step: T) => boolean,
): SequentialStepState {
  const index = steps.findIndex(({ id }) => id === stepId);
  if (index < 0) return "UNKNOWN";
  if (isCompleted(steps[index])) return "COMPLETED";
  const firstIncomplete = steps.findIndex((step) => !isCompleted(step));
  return index === firstIncomplete ? "CURRENT" : "LATER";
}
