export interface BusinessProfile {
  businessContext: string;
  targetAudience: string;
  ambition: string;
  primaryBusinessProcess: string;
  currentDigitalReality: string;
  source: string;
  uncertainties: string;
  confirmedAt: string;
}

export interface BusinessProfileLoadResult {
  value: BusinessProfile;
  warning: string;
}

export const aquaFlaskBusinessProfileStorageKey = "atlas.workspace.case.0002.business-profile.v1";

export const emptyBusinessProfile = (): BusinessProfile => ({
  businessContext: "",
  targetAudience: "",
  ambition: "",
  primaryBusinessProcess: "",
  currentDigitalReality: "",
  source: "",
  uncertainties: "",
  confirmedAt: "",
});

const fieldLimits: Record<Exclude<keyof BusinessProfile, "confirmedAt">, number> = {
  businessContext: 1200,
  targetAudience: 800,
  ambition: 800,
  primaryBusinessProcess: 1200,
  currentDigitalReality: 1200,
  source: 800,
  uncertainties: 1200,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isBusinessProfile(value: unknown): value is BusinessProfile {
  if (!isRecord(value) || Object.keys(value).length !== 8) return false;

  const textFieldsValid = Object.entries(fieldLimits).every(
    ([field, limit]) =>
      typeof value[field] === "string" &&
      value[field].trim().length > 0 &&
      value[field].length <= limit,
  );
  const confirmedAt = value.confirmedAt;

  return textFieldsValid &&
    typeof confirmedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(confirmedAt) &&
    !Number.isNaN(Date.parse(`${confirmedAt}T00:00:00`));
}

export function loadBusinessProfile(storage: Storage): BusinessProfileLoadResult {
  try {
    const raw = storage.getItem(aquaFlaskBusinessProfileStorageKey);
    if (!raw) return { value: emptyBusinessProfile(), warning: "" };
    const parsed: unknown = JSON.parse(raw);
    return isBusinessProfile(parsed)
      ? { value: parsed, warning: "" }
      : {
          value: emptyBusinessProfile(),
          warning: "Het opgeslagen bedrijfsbegrip was ongeldig en is veilig overgeslagen.",
        };
  } catch {
    return {
      value: emptyBusinessProfile(),
      warning: "Het bedrijfsbegrip kon niet lokaal worden gelezen. Je werkt met een veilige lege versie.",
    };
  }
}

export function saveBusinessProfile(storage: Storage, profile: BusinessProfile): boolean {
  if (!isBusinessProfile(profile)) return false;

  try {
    storage.setItem(aquaFlaskBusinessProfileStorageKey, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
