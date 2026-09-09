export const DISPLAY_PRIORITIES = Object.freeze(["PRIMARY", "SECONDARY", "HIDDEN"]);
export const CONTEXT_SIGNALS = Object.freeze({
  "printing.counter": { label: "Kassabedrukking", defaultPriority: "SECONDARY" },
  "printing.webshop": { label: "Webshop bedrukking", defaultPriority: "SECONDARY" },
  "printing.completed_today": { label: "Vandaag afgerond", defaultPriority: "SECONDARY" },
});

export function validateDisplayPriorities(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.entries(value).some(([id, priority]) => !Object.hasOwn(CONTEXT_SIGNALS, id) || !DISPLAY_PRIORITIES.includes(priority))) {
    throw Object.assign(new Error("Ongeldige weergaveprioriteit voor contextsignalen."), { statusCode: 400, code: "SIGNAL_DISPLAY_INVALID" });
  }
  return value;
}

// Presentation only. This never grants permission to the underlying data.
export function effectiveSignalDisplay(policy, userId) {
  const user = policy?.users?.[userId]; const preset = policy?.presets?.[user?.presetId];
  return Object.fromEntries(Object.entries(CONTEXT_SIGNALS).map(([id, signal]) => {
    const priority = user?.displayPriorities?.[id] ?? preset?.displayPriorities?.[id] ?? signal.defaultPriority;
    return [id, { priority: DISPLAY_PRIORITIES.includes(priority) ? priority : "HIDDEN", source: user?.displayPriorities?.[id] ? "Individuele instelling" : preset?.displayPriorities?.[id] ? `Preset: ${preset.label}` : "Standaard" }];
  }));
}
