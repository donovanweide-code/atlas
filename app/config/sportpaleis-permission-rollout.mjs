// First tenant configuration authorized for the central Sportpaleis release.
// Identity bindings belong here, never in the generic permission engine.
export const SPORTPALEIS_PERMISSION_TENANT = "sport-2000-sportpaleis-bv";
export const SPORTPALEIS_INITIAL_PROFILES = Object.freeze({
  "user-25812f676558376d": { label: "Donovan", presetId: "developer", expectedLegacyRole: "admin" },
  "user-57cc20b14fc0dfd1": { label: "Kevin", presetId: "owner", expectedLegacyRole: "admin" },
  "user-13960f8a3cae2eff": { label: "Patrick", presetId: "operations", expectedLegacyRole: "operator" },
  "user-5d0a69561429c36f": { label: "Erik", presetId: "production", expectedLegacyRole: "operator" },
});
