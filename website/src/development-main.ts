import "./main";

const developmentObservationMarkers = [
  ["#eerste-publieke-minuut", "public.home.entry"],
  ["#begrijpen", "public.home.understanding"],
  ["#digitaal-fundament", "public.home.digital-foundation"],
  ["#bevestigd-werk", "public.projects.confirmed-work"],
  ["#contact-verkenning", "public.contact.exploration"],
] as const;

developmentObservationMarkers.forEach(([selector, boundary]) => {
  document.querySelector(selector)?.setAttribute("data-atlas-observation", boundary);
});

try {
  if (localStorage.getItem("atlas.workspace.observing-context.v1")) {
    void import("./atlas-observe")
      .then(({ mountObservationCapture }) => mountObservationCapture())
      .catch(() => undefined);
  }
} catch {
  // Lokale opslag mag de publieke Experience nooit onderbreken.
}
