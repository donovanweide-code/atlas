import test from "node:test";
import assert from "node:assert/strict";
import {
  aquaFlaskBusinessProfileStorageKey,
  emptyBusinessProfile,
  isBusinessProfile,
  loadBusinessProfile,
  saveBusinessProfile,
} from "../src/atlas-business-profile.ts";

class MemoryStorage {
  #values = new Map();
  get length() { return this.#values.size; }
  clear() { this.#values.clear(); }
  getItem(key) { return this.#values.get(key) ?? null; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  removeItem(key) { this.#values.delete(key); }
  setItem(key, value) { this.#values.set(key, String(value)); }
}

const confirmedProfile = {
  businessContext: "Een bestaande onderneming waarvoor Atlas eerst de bedrijfswerkelijkheid vastlegt.",
  targetAudience: "Door de ondernemer bevestigde doelgroep.",
  ambition: "De door de ondernemer bevestigde volgende beweging.",
  primaryBusinessProcess: "Het bedrijfsproces dat de actuele technische context betekenis geeft.",
  currentDigitalReality: "De huidige, door een mens bevestigde digitale werkelijkheid.",
  source: "Gesprek met de ondernemer op 23 juli 2026.",
  uncertainties: "Verdienmodel en seizoensinvloed zijn voor deze slice niet bevestigd.",
  confirmedAt: "2026-07-23",
};

test("een Business Profile bevat uitsluitend de acht afgesproken gegevens", () => {
  assert.deepEqual(Object.keys(confirmedProfile), [
    "businessContext",
    "targetAudience",
    "ambition",
    "primaryBusinessProcess",
    "currentDigitalReality",
    "source",
    "uncertainties",
    "confirmedAt",
  ]);
  assert.equal(isBusinessProfile(confirmedProfile), true);
  assert.equal(isBusinessProfile({ ...confirmedProfile, salesStatus: "lead" }), false);
});

test("lege of onbevestigde bedrijfskennis wordt niet als geldig profiel opgeslagen", () => {
  const storage = new MemoryStorage();
  assert.equal(saveBusinessProfile(storage, { ...confirmedProfile, targetAudience: "" }), false);
  assert.equal(storage.getItem(aquaFlaskBusinessProfileStorageKey), null);
  assert.deepEqual(loadBusinessProfile(storage).value, emptyBusinessProfile());
});

test("bewust onbekende kennis kan expliciet worden bevestigd zonder het model uit te breiden", () => {
  const profileWithUnknown = { ...confirmedProfile, targetAudience: "Nog onbekend." };
  assert.equal(isBusinessProfile(profileWithUnknown), true);
  assert.equal(Object.keys(profileWithUnknown).length, 8);
});

test("bevestigd bedrijfsbegrip wordt lokaal bewaard en beschadigde data veilig overgeslagen", () => {
  const storage = new MemoryStorage();
  assert.equal(saveBusinessProfile(storage, confirmedProfile), true);
  assert.deepEqual(loadBusinessProfile(storage).value, confirmedProfile);

  storage.setItem(aquaFlaskBusinessProfileStorageKey, '{"businessContext":"onvolledig"}');
  const recovered = loadBusinessProfile(storage);
  assert.match(recovered.warning, /ongeldig/);
  assert.deepEqual(recovered.value, emptyBusinessProfile());
});
