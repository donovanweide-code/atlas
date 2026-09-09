export type DisplayPriority = "PRIMARY" | "SECONDARY" | "HIDDEN";
export const DISPLAY_PRIORITIES: readonly DisplayPriority[];
export const CONTEXT_SIGNALS: Readonly<Record<string, { label: string; defaultPriority: DisplayPriority }>>;
export function validateDisplayPriorities(value?: unknown): Record<string, DisplayPriority>;
export function effectiveSignalDisplay(policy: unknown, userId: string): Record<string, { priority: DisplayPriority; source: string }>;
